// src/index.ts — Node.js Real-time & LMS Service
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { getAllLevels, getLevelById, getLevelsByLanguage } from './controllers/levelController.js';
import { getRooms, getPodcasts, getAgoraToken } from './controllers/roomController.js';
import { registerSocketHandlers, createRoomInMemory, getActiveRooms, setIO, forceNextSublevel } from './services/roomService.js';
import { RoomState } from './types/index.js';
import db from './db/index.js';
import { rooms } from './db/schema.js';
import type { Request, Response } from 'express';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setIO(io);

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }));
app.use(express.json());

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
httpServer.listen(PORT, () => {
  console.log(`\n🎙️  LUCY Node.js Service running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`📚 100 levels seeded in SQLite database\n`);
});
