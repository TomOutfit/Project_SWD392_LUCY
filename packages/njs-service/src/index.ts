// src/index.ts — Node.js Real-time & LMS Service
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getAllLevels, getLevelById, getLevelsByLanguage } from './controllers/levelController.js';
import { getRooms, getPodcasts, getAgoraToken } from './controllers/roomController.js';
import { registerSocketHandlers, createRoomInMemory, getActiveRooms, setIO, forceNextSublevel } from './services/roomService.js';
import { RoomState } from './types/index.js';
import db from './db/index.js';
import { rooms, podcasts } from './db/schema.js';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getAnonymousName } from './utils/anonymous.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setIO(io);

app.use(cors({ origin: true, credentials: true, exposedHeaders: ['Server-Timing'] }));
app.use(express.json());

// Server-Timing Middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  const originalWriteHead = res.writeHead;
  res.writeHead = function (this: any, statusCode: any, ...args: any[]) {
    if (!res.headersSent) {
      const diff = process.hrtime(start);
      const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6);
      res.setHeader('Server-Timing', `app;dur=${timeMs.toFixed(2)};desc="Node Processing"`);
    }
    return originalWriteHead.apply(this, [statusCode, ...args] as any);
  } as any;
  next();
});

// Serve uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'LUCY Node.js Service', timestamp: new Date().toISOString() }));

// ── Latency helpers ──────────────────────────────────────────────────────────

/** In-memory ring-buffer (max 500 rows) shared between HTTP + WS logging */
const latencyBuffer: Array<{
  timestamp: string; endpoint: string;
  networkMs: number; serverMs: number; totalMs: number; clientIp: string;
}> = [];
const LATENCY_BUFFER_MAX = 500;

/**
 * Resolve the absolute path to `document/latency_metrics.md`.
 *
 * Resolution order:
 *   1. LATENCY_MD_PATH  — explicit override (useful in Docker / CI)
 *   2. Walk up from process.cwd() looking for "document/latency_metrics.md"
 *      (works whether the process is started from packages/njs-service or the
 *       project root).
 */
function resolveLatencyMdPath(): string | null {
  // 1. Env override
  if (process.env.LATENCY_MD_PATH) return process.env.LATENCY_MD_PATH;

  const isDeployed = process.env.NODE_ENV === 'production' || fs.existsSync('/.dockerenv') || process.cwd().startsWith('/app');

  if (isDeployed) {
    // Look in persistent data directory first
    const persistentPath = path.join(process.cwd(), 'data', 'latency_metrics.md');
    if (fs.existsSync(persistentPath)) return persistentPath;

    // If not found in data but a template exists at /app/document/latency_metrics.md, copy it to data/
    const templatePath = '/app/document/latency_metrics.md';
    if (fs.existsSync(templatePath)) {
      try {
        const dataDir = path.dirname(persistentPath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.copyFileSync(templatePath, persistentPath);
        console.log(`[Telemetry] Initialized persistent latency_metrics.md from template at ${persistentPath}`);
        return persistentPath;
      } catch (e) {
        console.warn(`[Telemetry] Failed to copy latency template to persistent path:`, e);
      }
    }
  } else {
    // 2. Walk up at most 4 levels from cwd (Local development)
    let dir = process.cwd();
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, 'document', 'latency_metrics.md');
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break; // reached filesystem root
      dir = parent;
    }
  }

  return null;
}

function appendToLatencyMd(mdRow: string): void {
  const mdFilePath = resolveLatencyMdPath();
  if (mdFilePath) {
    try {
      fs.appendFileSync(mdFilePath, mdRow);
    } catch (e) {
      console.warn('[Telemetry] Could not write to latency_metrics.md:', e);
    }
  }
}

function formatMdRow(
  now: Date,
  endpointStr: string,
  networkMs: number,
  serverMs: number,
  totalMs: number,
  clientIp: string,
): string {
  const timestampMD = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return `| ${timestampMD} | ${endpointStr} | ~${networkMs.toFixed(2)} ms | ~${serverMs.toFixed(2)} ms | ~${totalMs.toFixed(2)} ms | Client IP: ${clientIp} |\n`;
}

function logLatencyEntry(
  now: Date,
  endpointStr: string,
  networkMs: number,
  serverMs: number,
  totalMs: number,
  clientIp: string,
  logFileName: string,
): void {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  // Raw .log file (always written)
  const logLine = `[${now.toISOString()}] [${clientIp}] ${endpointStr} - RTT: ${totalMs.toFixed(2)}ms, Server: ${serverMs.toFixed(2)}ms, Network: ${networkMs.toFixed(2)}ms\n`;
  try { fs.appendFileSync(path.join(logsDir, logFileName), logLine); } catch { /* non-fatal */ }

  // In-memory buffer
  latencyBuffer.push({
    timestamp: now.toISOString(),
    endpoint: endpointStr,
    networkMs, serverMs, totalMs, clientIp,
  });
  if (latencyBuffer.length > LATENCY_BUFFER_MAX) latencyBuffer.shift();

  // Markdown file (written wherever the file is found — local dev only in most cases)
  appendToLatencyMd(formatMdRow(now, endpointStr, networkMs, serverMs, totalMs, clientIp));
}

// ── Telemetry / Latency endpoints ─────────────────────────────────────────────

// POST /api/latency/log — called by the frontend Axios interceptor after each HTTP request
app.post('/api/latency/log', (req, res) => {
  try {
    const { url, method, totalMs, serverMs, networkMs } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
    const now = new Date();
    const endpointStr = `\`${String(method).toUpperCase()} ${url}\``;

    logLatencyEntry(now, endpointStr, Number(networkMs), Number(serverMs), Number(totalMs), clientIp, 'network_latency.log');
    res.json({ success: true });
  } catch (err) {
    console.error('[Telemetry] Error logging HTTP latency:', err);
    res.status(500).json({ error: 'Failed to write log' });
  }
});

// GET /api/latency/metrics — export in-memory buffer as JSON (useful when deployed)
app.get('/api/latency/metrics', (_req, res) => {
  res.json({
    count: latencyBuffer.length,
    mdPath: resolveLatencyMdPath() ?? '(not found — deployed environment)',
    entries: latencyBuffer,
  });
});

// GET /api/latency/raw — view raw markdown in browser
app.get('/api/latency/raw', (_req, res) => {
  const mdPath = resolveLatencyMdPath();
  if (mdPath && fs.existsSync(mdPath)) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    fs.createReadStream(mdPath).pipe(res);
  } else {
    res.status(404).json({ error: 'latency_metrics.md not found' });
  }
});

// GET /api/latency/download — download latency_metrics.md
app.get('/api/latency/download', (_req, res) => {
  const mdPath = resolveLatencyMdPath();
  if (mdPath && fs.existsSync(mdPath)) {
    res.download(mdPath, 'latency_metrics.md');
  } else {
    res.status(404).json({ error: 'latency_metrics.md not found' });
  }
});


// Level routes
app.get('/api/levels', getAllLevels);
app.get('/api/levels/lang/:lang', getLevelsByLanguage);
app.get('/api/levels/:id', getLevelById);

// Room routes
app.get('/api/rooms', getRooms);
app.post('/api/rooms/:id/next-stage', async (req, res) => {
  const success = await forceNextSublevel(req.params.id);
  if (success) {
    res.json({ success: true, message: 'Stage transition triggered' });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Podcast routes
app.get('/api/podcasts', getPodcasts);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'podcasts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.id}-${Date.now()}.webm`);
  }
});
const upload = multer({ storage });

app.post('/api/podcasts/:id/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
  const fileUrl = `/uploads/podcasts/${req.file.filename}`;
  try {
    await db.update(podcasts).set({ fileUrl }).where(eq(podcasts.id, req.params.id));
    res.json({ success: true, fileUrl });
  } catch (err) {
    console.error('Failed to update podcast fileUrl:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const uploadDoc = multer({ storage: docStorage });

app.post('/api/rooms/:id/upload-doc', uploadDoc.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const fileUrl = `/uploads/documents/${req.file.filename}`;
  res.json({
    success: true,
    fileUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
  });
});

// Agora token (stub)
app.get('/api/agora/token', getAgoraToken);

// Get active rooms (for joining in-memory rooms)
app.get('/api/rooms/active', (_, res) => res.json(getActiveRooms()));

// Socket.io authentication middleware
io.use((socket, next) => {
  // In production: verify JWT from handshake auth header
  // For MVP: accept any connection
  const userId = socket.handshake.auth.userId ?? Math.floor(Math.random() * 10000);
  const userPersonaId = socket.handshake.auth.personaId ?? 1;
  const userRole = socket.handshake.auth.role ?? socket.handshake.auth.userRole ?? 'LUCY';
  const userName = getAnonymousName(userId, userRole);

  socket.data.userId = userId;
  socket.data.userName = userName;
  socket.data.userPersonaId = userPersonaId;
  socket.data.userRole = userRole;

  next();
});

io.on('connection', (socket) => {
  console.log(`[Socket] User ${socket.data.userId} connected`);
  registerSocketHandlers(io, socket);
});

// Override create room to also push to in-memory + persist to DB

app.post('/api/rooms', async (req: Request, res: Response) => {
  try {
    const { name, hostId, hostName, hostPersonaId, hostRole, language, levelId, levelName } = req.body;
    if (!name || !hostId || !language || !levelId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const anonHostName = getAnonymousName(hostId, hostRole);

    const roomId = createRoomInMemory({
      name, hostId, hostName: anonHostName, hostPersonaId, hostRole,
      language: language.toUpperCase(), levelId, levelName,
      isLive: true, state: RoomState.ACTIVE, currentSubLevel: 1,
    });

    const room = getActiveRooms().find(r => r.id === roomId)!;

    // Persist to SQLite DB so GET /api/rooms can see it
    await db.insert(rooms).values({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      hostName: room.hostName,
      hostPersonaId: room.hostPersonaId,
      hostRole: room.hostRole,
      language: room.language,
      levelId: room.levelId,
      levelName: room.levelName,
      isLive: room.isLive,
      state: room.state,
      currentSubLevel: room.currentSubLevel,
      createdAt: room.createdAt!,
      participantCount: room.participantCount,
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

const PORT = process.env.PORT || 3001;
// Bind to 127.0.0.1 so it's loopback only (hidden from Render port detector)
httpServer.listen(Number(PORT), '127.0.0.1', async () => {
  // Clear ghost rooms from previous dev sessions
  try {
    await db.update(rooms).set({ isLive: false });
  } catch (e) {}

  console.log(`\n🎙️  LUCY Node.js Service running on http://127.0.0.1:${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`📚 100 levels seeded in SQLite database\n`);
});
