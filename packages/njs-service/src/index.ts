// src/index.ts — Node.js Real-time & LMS Service
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getAllLevels, getLevelById, getLevelsByLanguage } from './controllers/levelController.js';
import { getRooms, getPodcasts, getAgoraToken } from './controllers/roomController.js';
import { getSessionHistory, getStudyLeaderboard, getRecentSessions } from './controllers/sessionController.js';
import { registerSocketHandlers, createRoomInMemory, getActiveRooms, setIO, forceNextSublevel } from './services/roomService.js';
import { RoomState } from './types/index.js';
import db from './db/index.js';
import { rooms, podcasts } from './db/schema.js';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { resolveLatencyMdPath, appendLatencyRowToMd } from './utils/telemetry.js';
import { getAnonymousName } from './utils/anonymous.js';
import type { IAudioMetadata } from 'music-metadata';

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

// Serve uploads directory with Range request support for audio streaming
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    // Enable CORS and Range requests for static audio resources
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Set proper MIME types for audio files
    if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
    } else if (filePath.endsWith('.mp4') || filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.wav') || filePath.endsWith('.wave')) {
      res.setHeader('Content-Type', 'audio/wav');
    }
  }
}));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'LUCY Node.js Service', timestamp: new Date().toISOString() }));

// ── Latency helpers ──────────────────────────────────────────────────────────

/** In-memory ring-buffer (max 500 rows) shared between HTTP + WS logging */
const latencyBuffer: Array<{
  timestamp: string; endpoint: string;
  networkMs: number; serverMs: number; totalMs: number; clientIp: string;
}> = [];
const LATENCY_BUFFER_MAX = 500;

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

  // Markdown file (routed to Section 5 or Section 6 depending on client IP)
  appendLatencyRowToMd(now, endpointStr, networkMs, serverMs, totalMs, clientIp);
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

const isAudioMime = (mimetype: string) => {
  if (!mimetype) return true;
  const baseMime = mimetype.split(';')[0].trim().toLowerCase();
  const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'video/webm', 'application/octet-stream'];
  return baseMime.startsWith('audio/') || allowed.includes(baseMime);
};

// Only allow audio formats. Reject oversized or non-audio files.
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB cap
  fileFilter: (_req, file, cb) => {
    if (isAudioMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only audio files are allowed.`));
    }
  }
});

app.post('/api/podcasts/:id/upload', (req: Request, res: Response) => {
  const uploadHandler = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (isAudioMime(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Only audio files are allowed.`));
      }
    }
  }).single('audio');

  uploadHandler(req, res, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File too large. Maximum size is 100 MB.' });
        } else {
          res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return;
      }
      res.status(400).json({ error: err.message || 'Upload failed' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const fileUrl = `/uploads/podcasts/${req.file.filename}`;
    const filePath = req.file.path;

    // Parse actual audio duration from the uploaded file using music-metadata
    let actualDurationSec: number | null = null;
    try {
      const mm = await import('music-metadata');
      const metadata: IAudioMetadata = await mm.parseFile(filePath);
      actualDurationSec = Math.round(metadata.format.duration ?? 0);
    } catch (parseErr) {
      // music-metadata may fail for some webm variants; fall back gracefully
      console.warn('[Upload] Could not parse audio duration from file:', parseErr);
    }

    try {
      if (actualDurationSec !== null) {
        await db.update(podcasts).set({ fileUrl, durationSec: actualDurationSec }).where(eq(podcasts.id, req.params.id));
      } else {
        await db.update(podcasts).set({ fileUrl }).where(eq(podcasts.id, req.params.id));
      }
      res.json({ success: true, fileUrl, durationSec: actualDurationSec });
    } catch (dbErr: any) {
      console.error('Failed to update podcast fileUrl:', dbErr);
      res.status(500).json({ error: 'Database update failed' });
    }
  });
});

app.post('/api/podcasts/:id/listen', async (req, res) => {
  try {
    const podcastList = await db.select().from(podcasts).where(eq(podcasts.id, req.params.id)).limit(1);
    if (podcastList.length === 0) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    const currentCount = podcastList[0].listenCount || 0;
    await db.update(podcasts).set({ listenCount: currentCount + 1 }).where(eq(podcasts.id, req.params.id));
    res.json({ success: true, listenCount: currentCount + 1 });
  } catch (err) {
    console.error('Failed to increment listen count:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

app.patch('/api/podcasts/:id', async (req: Request, res: Response) => {
  const { title } = req.body as { title?: string };
  if (!title || title.trim().length === 0) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  try {
    const existing = await db.select().from(podcasts).where(eq(podcasts.id, req.params.id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Podcast not found' });
      return;
    }
    await db.update(podcasts).set({ title: title.trim() }).where(eq(podcasts.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update podcast title:', err);
    res.status(500).json({ error: 'Failed to update title' });
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

// Study session routes
app.get('/api/sessions/user/:userId', getSessionHistory);
app.get('/api/sessions/leaderboard', getStudyLeaderboard);
app.get('/api/sessions/recent', getRecentSessions);

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
