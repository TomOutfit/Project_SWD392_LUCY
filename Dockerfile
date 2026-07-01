# ============================================================
# LUCY — Single Dockerfile (Frontend + NJS-Service + NET-Service)
# Architecture: nginx (port 80) → routes to internal services
#   /api/auth, /api/users, /api/wallet, /api/gifts → .NET :5001
#   /api/levels, /api/rooms, /api/podcasts, /api/agora → NJS :3001
#   /socket.io/                                        → NJS :3001
#   /                                                  → React static
# ============================================================

# ─── Stage 1: Build Frontend ─────────────────────────────────
FROM node:20 AS frontend-builder
WORKDIR /build/frontend

COPY packages/frontend/package*.json ./
RUN npm ci

COPY packages/frontend/ ./

# VITE_API_URL is intentionally left unset → falls back to '/api' (same-origin via nginx)
# VITE_NJS_URL is intentionally left unset → falls back to '' (same-origin, Socket.io proxied via nginx)
ARG VITE_AGORA_APP_ID=c309f46a6f23498a8f8bec6dd3f17fb8
ENV VITE_AGORA_APP_ID=$VITE_AGORA_APP_ID

RUN npm run build

# ─── Stage 2: Build NJS Service ──────────────────────────────
# Use node:20 (Debian bookworm) to match the final runtime
# so native modules (better-sqlite3) are ABI-compatible.
FROM node:20 AS njs-builder
WORKDIR /build/njs

COPY packages/njs-service/package*.json ./
RUN npm ci

COPY packages/njs-service/ ./
RUN npm run build

# ─── Stage 3: Build .NET Service ─────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS net-builder
WORKDIR /build/net

COPY packages/net-service/ ./
RUN dotnet publish -c Release -o /publish --no-self-contained

# ─── Stage 4: Final Runtime Image ────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0

# Install Node.js 20, nginx, supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gnupg \
        nginx \
        supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Frontend static files ──────────────────────────────────
COPY --from=frontend-builder /build/frontend/dist /var/www/html

# ── NJS Service ───────────────────────────────────────────
WORKDIR /app/njs
COPY --from=njs-builder /build/njs/dist ./dist
COPY --from=njs-builder /build/njs/node_modules ./node_modules
COPY --from=njs-builder /build/njs/package.json ./package.json

# Persistent directories for SQLite DB + uploaded audio files
RUN mkdir -p /app/njs/data /app/njs/uploads

# ── .NET Service ──────────────────────────────────────────
COPY --from=net-builder /publish /app/net

# ── nginx config ──────────────────────────────────────────
COPY nginx.conf /etc/nginx/nginx.conf

# ── supervisord config ────────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/lucy.conf

# Expose only port 80 (nginx is the single entry point)
EXPOSE 80

# Optional: mount a volume for persistent SQLite data & uploads
VOLUME ["/app/njs/data", "/app/njs/uploads"]

CMD ["sh", "-c", "sed -i \"s/listen 80;/listen ${PORT:-80};/g\" /etc/nginx/nginx.conf && exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf"]
