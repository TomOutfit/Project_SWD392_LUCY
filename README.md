# LUCY — Language Unity & Collaborative Youth
https://project-swd392-lucy.onrender.com/

https://lucygroup.vercel.app/

Real-time social audio platform for Gen Z language learners (English, Chinese, Japanese), built with a microservices architecture following the École 42 / RBL methodology.

## Architecture

```
packages/
├── frontend/          React 18 + Vite + TypeScript + TailwindCSS
├── net-service/       .NET Core 10 — Identity, Auth, Wallet, Gifts
└── njs-service/       Node.js 22 — Real-time Rooms, Socket.io, LMS, Agora
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, TailwindCSS, Framer Motion, Zustand, Socket.io-client |
| Identity & Payments | .NET Core 10, EF Core (InMemory), JWT, BCrypt, Swagger |
| Real-time & Content | Node.js 22, Express, Socket.io, SQLite (better-sqlite3), Drizzle ORM |
| Audio | Agora SDK (stubbed for MVP) |
| Design | Orbitron + Exo 2 + Inter fonts, neon cyberpunk dark theme |

## Quick Start

### Prerequisites
- Node.js 22+
- .NET SDK 10
- npm or pnpm

### 1. Install Dependencies

```bash
cd packages/frontend && npm install
cd ../net-service && dotnet restore
cd ../njs-service && npm install
```

### 2. Run All Services

```bash
# Terminal 1 — .NET Identity Service
cd packages/net-service && dotnet run
# → http://localhost:5001 (Swagger UI available)

# Terminal 2 — Node.js Real-time Service
cd packages/njs-service && npm run dev
# → http://localhost:3001

# Terminal 3 — React Frontend
cd packages/frontend && npm run dev
# → http://localhost:5173
```

## Features

### User Roles
- **LUCY** (Anonymous): Join rooms, hand-raise, practice
- **LUCY Pro**: Create rooms, pin LMS content, earn gifts
- **LUCY Super**: All Pro features + record podcasts

### Core Features
- Real-time audio rooms via Socket.io + Agora (stubbed)
- Hand-raise queue system with host moderation
- 100 levels across 3 languages (EN/ZH/JA) × 3 stages
- Auto stage progression every 10 minutes
- Virtual wallet with deposit + gift system
- Weekly leaderboard by gift value received
- Podcast recording (Super hosts only)
- Anonymous identity — real identity isolated in .NET, only anonymous tokens to Node.js

## API Endpoints

### .NET Service (Port 5001)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login → JWT |
| GET | /api/users/me | Yes | Current user profile |
| GET | /api/users/leaderboard | Yes | Gift leaderboard |
| GET | /api/wallet | Yes | Wallet balance + history |
| POST | /api/wallet/deposit | Yes | Add funds |
| POST | /api/gifts/send | Yes | Send gift to recipient |

### Node.js Service (Port 3001)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/levels | All 100 levels |
| GET | /api/levels/:id | Level + content |
| GET | /api/rooms | Active rooms |
| POST | /api/rooms | Create room |
| GET | /api/agora/token | Agora RTC token |
| GET | /api/podcasts | Podcast library |
| WS | /* | Socket.io real-time events |

## Socket.io Events

**Client → Server:** `join-room`, `leave-room`, `hand-raise`, `hand-lower`, `grant-speak`, `revoke-speak`, `pin-content`, `start-recording`, `stop-recording`, `close-room`

**Server → Client:** `room-joined`, `room-updated`, `participant-joined`, `hand-queue-updated`, `speak-granted`, `stage-changed`, `gift-received`, `pinned-content-updated`, `recording-started`, `recording-stopped`, `room-closed`

## Design System

Colors: `#0B0B1A` void black, `#00F5FF` neon cyan, `#7B2FFF` electric violet, `#FF2D6B` hot magenta
Fonts: Orbitron (headings), Exo 2 (UI), Inter (body)

## 10-Week Action Plan (SWD392)

| Week | Focus |
|---|---|
| 1-2 | Infrastructure: .NET Auth, React Login/Register |
| 3-5 | Real-time MVP: Socket.io rooms, Agora stub, React room UI |
| 6-7 | LMS & Design Patterns: 100 levels, Observer Pattern for stage auto-transition |
| 8-9 | Monetization: .NET Wallet, gift animations, leaderboard |
| 10 | Polish: Cross-testing, bug fixes, Beta release |
