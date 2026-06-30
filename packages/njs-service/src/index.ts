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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'LUCY Node.js Service', timestamp: new Date().toISOString() }));

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
  const userName = socket.handshake.auth.userName ?? `User_${userId}`;
  const userPersonaId = socket.handshake.auth.personaId ?? 1;
  const userRole = socket.handshake.auth.role ?? socket.handshake.auth.userRole ?? 'LUCY';

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

    const roomId = createRoomInMemory({
      name, hostId, hostName, hostPersonaId, hostRole,
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
httpServer.listen(PORT, async () => {
  // Clear ghost rooms from previous dev sessions
  try {
    await db.update(rooms).set({ isLive: false });
  } catch (e) {}

  console.log(`\n🎙️  LUCY Node.js Service running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`📚 100 levels seeded in SQLite database\n`);
});
