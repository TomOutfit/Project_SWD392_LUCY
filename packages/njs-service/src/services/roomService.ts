// src/services/roomService.ts
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Language, RoomState, Participant, ContentPin, Room } from '../types/index.js';
import { RoomStageSubject, SocketNotifierObserver, DbPersistenceObserver, MaterialRecommenderObserver } from './observer.js';
import db from '../db/index.js';
import { levels, rooms as roomsTable, podcasts } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

import { generateRecommendationsFromPin } from './aiService.js';

// ── Latency helpers (shared with index.ts via module-level helpers) ───────────

/** Walk up from cwd to find document/latency_metrics.md, or use LATENCY_MD_PATH env. */
function resolveLatencyMdPathRS(): string | null {
  if (process.env.LATENCY_MD_PATH) return process.env.LATENCY_MD_PATH;

  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'document', 'latency_metrics.md');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function appendWsLatency(
  now: Date,
  userId: number | string,
  userRole: string,
  latencyMs: number,
  clientIp: string,
): void {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  // Raw .log file (always written)
  const logLine = `[${now.toISOString()}] [${clientIp}] User: ${userId} (${userRole}) - Socket.io Ping RTT: ${latencyMs}ms\n`;
  try { fs.appendFileSync(path.join(logsDir, 'websocket_latency.log'), logLine); } catch { /* non-fatal */ }

  // Markdown file
  const mdFilePath = resolveLatencyMdPathRS();
  if (mdFilePath) {
    const dd = now.getDate().toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const timestampMD = `${dd}/${mm}/${now.getFullYear()} ${hh}:${min}`;
    const mdRow = `| ${timestampMD} | \`WebSocket Ping (User: ${userId})\` | ~${Number(latencyMs).toFixed(2)} ms | ~0.00 ms (Socket) | ~${Number(latencyMs).toFixed(2)} ms | Client IP: ${clientIp} |\n`;
    try { fs.appendFileSync(mdFilePath, mdRow); } catch { /* non-fatal */ }
  }
}

// In-memory room state (production: use Redis)
const activeRooms = new Map<string, {
  room: Room;
  stageTimer?: NodeJS.Timeout;
  subject?: RoomStageSubject;
  recording?: { id: string; startedAt: Date; creatorId: number };
  handQueue: Participant[];
  userSockets: Map<number, Set<string>>;
}>();

export function registerSocketHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;
  const userName = socket.data.userName;
  const userPersonaId = socket.data.userPersonaId;
  const userRole = socket.data.userRole;

  socket.on('join-room', ({ roomId, user }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return socket.emit('error', { message: 'Room not found' });

    if (!roomData.userSockets) {
      roomData.userSockets = new Map<number, Set<string>>();
    }

    let socketsSet = roomData.userSockets.get(user.id);
    if (!socketsSet) {
      socketsSet = new Set<string>();
      roomData.userSockets.set(user.id, socketsSet);
    }

    const isNewUserConnection = socketsSet.size === 0;
    socketsSet.add(socket.id);

    const existing = roomData.room.participants.find(p => p.oderId === user.id);

    if (!existing) {
      const isHost = roomData.room.hostId === user.id;
      const participant: Participant = {
        oderId: user.id, oderName: userName, oderPersonaId: user.personaId,
        oderRole: user.role, joinedAt: new Date().toISOString(),
        isMuted: !isHost, isSpeaking: isHost, handRaised: false,
        speakingDurationSec: 0,
        speakGranted: isHost,
      };
      roomData.room.participants.push(participant);
      roomData.room.participantCount = roomData.room.participants.length;
      db.update(roomsTable)
        .set({ participantCount: roomData.room.participantCount })
        .where(eq(roomsTable.id, roomId))
        .catch(err => console.error('[roomService] Failed to update participantCount in DB:', err));
      if (roomData.room.participantCount > 1 && !roomData.room.nextTransitionAt) {
        roomData.room.nextTransitionAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      }
      socket.join(roomId);
      socket.data.currentRoom = roomId;

      socket.emit('room-joined', { room: roomData.room, userId: user.id });
      socket.to(roomId).emit('participant-joined', { roomId, participant });
      socket.to(roomId).emit('room-updated', { room: roomData.room });
      socket.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
      fetchAndEmitRecommendations(io, roomId, roomData.room);
    } else {
      // Already in room — just re-sync state (handles reconnection / re-render)
      socket.join(roomId);
      socket.data.currentRoom = roomId;
      socket.emit('room-joined', { room: roomData.room, userId: user.id });
      
      if (isNewUserConnection) {
        io.to(roomId).emit('room-updated', { room: roomData.room });
      }
    }
  });

  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(io, socket, roomId);
  });

  socket.on('hand-raise', ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;

    const p = roomData.room.participants.find(p => p.oderId === socket.data.userId);
    if (!p) return;

    p.handRaised = true;
    p.handRaisedAt = new Date().toISOString();
    roomData.handQueue.push(p);

    io.to(roomId).emit('hand-raised', { roomId, oderId: p.oderId });
    io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
  });

  socket.on('hand-lower', ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;

    const p = roomData.room.participants.find(p => p.oderId === socket.data.userId);
    if (!p) return;

    p.handRaised = false;
    p.handRaisedAt = undefined;
    roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== socket.data.userId);

    io.to(roomId).emit('hand-lowered', { roomId, oderId: p.oderId });
    io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
  });

  socket.on('toggle-mute', ({ roomId, muted }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;

    const p = roomData.room.participants.find(p => p.oderId === socket.data.userId);
    if (p) {
      const isHost = roomData.room.hostId === socket.data.userId;
      if (isHost || p.speakGranted) {
        p.isMuted = muted;
        p.isSpeaking = !muted;
      }
    }
    io.to(roomId).emit('room-updated', { room: roomData.room });
  });

  socket.on('grant-speak', ({ roomId, participantId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    const p = roomData.room.participants.find(p => p.oderId === participantId);
    if (!p) return;

    p.isMuted = false;
    p.isSpeaking = true;
    p.handRaised = false;
    p.speakGranted = true;
    roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== participantId);

    io.to(roomId).emit('speak-granted', { roomId, oderId: participantId });
    io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
    io.to(roomId).emit('room-updated', { room: roomData.room });
  });

  socket.on('revoke-speak', ({ roomId, participantId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    const p = roomData.room.participants.find(p => p.oderId === participantId);
    if (p) { p.isMuted = true; p.isSpeaking = false; p.speakGranted = false; }

    io.to(roomId).emit('speak-revoked', { roomId, oderId: participantId });
    io.to(roomId).emit('room-updated', { room: roomData.room });
  });

  socket.on('pin-content', async ({ roomId, content }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    const pin: ContentPin = {
      id: uuidv4(), title: content.title, url: content.url,
      type: content.type, pinnedBy: socket.data.userId, pinnedAt: new Date().toISOString(),
    };
    roomData.room.pinnedContent = pin;

    io.to(roomId).emit('pinned-content-updated', { roomId, pin });
    await fetchAndEmitRecommendations(io, roomId, roomData.room);
  });

  socket.on('start-recording', ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    if (roomData.recording) return;

    const recordingId = uuidv4();
    roomData.recording = { id: recordingId, startedAt: new Date(), creatorId: socket.data.userId };

    io.to(roomId).emit('recording-started', { roomId, recordingId });
  });

  socket.on('stop-recording', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    if (!roomData.recording) return;

    const podcastId = uuidv4();
    const durationSec = Math.floor((Date.now() - roomData.recording.startedAt.getTime()) / 1000);
    const recording = roomData.recording;
    roomData.recording = undefined;

    // Insert podcast record BEFORE emitting recording-stopped so the file upload
    // can UPDATE a record that is guaranteed to exist on the server.
    try {
      await db.insert(podcasts).values({
        id: podcastId,
        roomId,
        roomName: roomData.room.name,
        creatorId: recording.creatorId,
        creatorName: roomData.room.hostName,
        title: `${roomData.room.name} — Session Recording`,
        durationSec,
        fileUrl: '',
        language: roomData.room.language,
        levelName: roomData.room.levelName,
        createdAt: new Date().toISOString(),
        listenCount: 0,
      });
    } catch (err) {
      console.error('[roomService] Failed to persist podcast metadata:', err);
      return; // Don't emit if DB insert failed
    }

    // Now the podcast record exists — safe to tell clients to upload.
    io.to(roomId).emit('recording-stopped', { roomId, podcastId });
  });

  socket.on('close-room', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    if (roomData.stageTimer) clearInterval(roomData.stageTimer);

    io.to(roomId).emit('room-closed', { roomId });
    io.in(roomId).socketsLeave(roomId);
    activeRooms.delete(roomId);

    try {
      await db.update(roomsTable).set({ isLive: false }).where(eq(roomsTable.id, roomId));
    } catch (err) {
      console.error('[roomService] Failed to mark room as closed in DB:', err);
    }
  });

  socket.on('force-stage-transition', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    await roomData.subject?.transitionToNextSubLevel(roomData.room);
  });

  socket.on('toggle-auto-transition', ({ roomId, autoTransition }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    roomData.room.autoTransition = autoTransition;
    io.to(roomId).emit('room-updated', { room: roomData.room });
  });

  socket.on('get-recommendations', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;
    await fetchAndEmitRecommendations(io, roomId, roomData.room);
  });

  socket.on('send-gift', ({ roomId, giftType, amount, recipientId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;

    const recipient = roomData.room.participants.find(p => p.oderId === recipientId);
    const recipientName = recipient ? recipient.oderName : `Anonymous Learner`;

    io.to(roomId).emit('gift-received', {
      id: uuidv4(),
      senderName: socket.data.userName,
      senderPersonaId: socket.data.userPersonaId,
      giftType,
      amount,
      recipientName,
      recipientId,
    });
  });

  socket.on('kick-user', ({ roomId, userIdToKick }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    const targetSockets = roomData.userSockets?.get(userIdToKick);
    if (targetSockets) {
      for (const socketId of targetSockets) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          targetSocket.emit('kicked-from-room', { roomId });
          targetSocket.leave(roomId);
          targetSocket.data.currentRoom = undefined;
        }
      }
    }

    roomData.room.participants = roomData.room.participants.filter(p => p.oderId !== userIdToKick);
    roomData.room.participantCount = roomData.room.participants.length;
    db.update(roomsTable)
      .set({ participantCount: roomData.room.participantCount })
      .where(eq(roomsTable.id, roomId))
      .catch(err => console.error('[roomService] Failed to update participantCount in DB:', err));
    roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== userIdToKick);

    io.to(roomId).emit('room-left', { roomId, oderId: userIdToKick, kicked: true });
    io.to(roomId).emit('room-updated', { room: roomData.room });
    io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
  });

  socket.on('disconnect', () => {
    if (socket.data.currentRoom) {
      handleLeaveRoom(io, socket, socket.data.currentRoom);
    }
  });

  socket.on('ping', (cb) => {
    try { cb({ ok: true, t: Date.now() }); } catch { /* noop */ }
  });

  socket.on('log-websocket-latency', ({ latencyMs }) => {
    try {
      const clientIp = socket.handshake.address || 'Unknown';
      appendWsLatency(new Date(), userId, userRole, Number(latencyMs), clientIp);
    } catch (err) {
      console.error('[Telemetry] Error logging WebSocket latency:', err);
    }
  });

  socket.on('ping-user', ({ targetUserId, timestamp }) => {
    const currentRoomId = socket.data.currentRoom;
    if (!currentRoomId) return;
    const roomData = activeRooms.get(currentRoomId);
    if (!roomData) return;
    
    const targetSockets = roomData.userSockets?.get(targetUserId);
    if (targetSockets) {
      for (const socketId of targetSockets) {
        io.to(socketId).emit('ping-from-user', { fromUserId: userId, timestamp });
      }
    }
  });

  socket.on('pong-user', ({ targetUserId, timestamp }) => {
    const currentRoomId = socket.data.currentRoom;
    if (!currentRoomId) return;
    const roomData = activeRooms.get(currentRoomId);
    if (!roomData) return;
    
    const targetSockets = roomData.userSockets?.get(targetUserId);
    if (targetSockets) {
      for (const socketId of targetSockets) {
        io.to(socketId).emit('pong-from-user', { fromUserId: userId, timestamp });
      }
    }
  });
}

function handleLeaveRoom(io: Server, socket: Socket, roomId: string) {
  const roomData = activeRooms.get(roomId);
  if (!roomData) return;

  const oderId = socket.data.userId;

  if (roomData.userSockets) {
    const socketsSet = roomData.userSockets.get(oderId);
    if (socketsSet) {
      socketsSet.delete(socket.id);
      if (socketsSet.size > 0) {
        // Still has other active connections, just leave socket room but do not clean up participant
        socket.leave(roomId);
        socket.data.currentRoom = undefined;
        return;
      }
    }
  }

  roomData.room.participants = roomData.room.participants.filter(p => p.oderId !== oderId);
  roomData.room.participantCount = roomData.room.participants.length;
  db.update(roomsTable)
    .set({ participantCount: roomData.room.participantCount })
    .where(eq(roomsTable.id, roomId))
    .catch(err => console.error('[roomService] Failed to update participantCount in DB:', err));
  if (roomData.room.participantCount <= 1) {
    roomData.room.nextTransitionAt = undefined;
  }
  roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== oderId);

  socket.leave(roomId);
  socket.data.currentRoom = undefined;

  io.to(roomId).emit('room-left', { roomId, oderId });
  io.to(roomId).emit('room-updated', { room: roomData.room });
  io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
}

export function createRoomInMemory(roomData: Omit<Room, 'id' | 'participants' | 'pinnedContent' | 'participantCount'>): string {
  const id = uuidv4();
  const fullRoom: Room = {
    ...roomData,
    id,
    participants: [],
    pinnedContent: null,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    nextTransitionAt: undefined,
  };

  const subject = new RoomStageSubject(id);
  subject.attach(new SocketNotifierObserver(ioInstance));
  subject.attach(new DbPersistenceObserver());
  subject.attach(new MaterialRecommenderObserver(ioInstance));

  // Set up auto stage progression (polls every second)
  const stageTimer = setInterval(async () => {
    const rd = activeRooms.get(id);
    if (!rd || rd.room.state === RoomState.CLOSED) {
      clearInterval(stageTimer);
      return;
    }
    // Only transition if timer is active and elapsed
    if (rd.room.participantCount > 1 && rd.room.nextTransitionAt) {
      const diffMs = new Date(rd.room.nextTransitionAt).getTime() - Date.now();
      if (diffMs <= 0) {
        await rd.subject?.transitionToNextSubLevel(rd.room);
      }
    }
  }, 1000);

  activeRooms.set(id, { room: fullRoom, stageTimer, subject, handQueue: [], userSockets: new Map<number, Set<string>>() });
  return id;
}

export async function forceNextSublevel(roomId: string): Promise<boolean> {
  const roomData = activeRooms.get(roomId);
  if (!roomData) return false;
  await roomData.subject?.transitionToNextSubLevel(roomData.room);
  return true;
}

async function fetchAndEmitRecommendations(io: Server, roomId: string, room: Room) {
  try {
    if (room.pinnedContent) {
      console.log(`[roomService] Pinned content detected, generating AI recommendations based on: ${room.pinnedContent.title}`);
      const recommendation = await generateRecommendationsFromPin(room.pinnedContent, room.language);
      io.to(roomId).emit('ai-recommendation-updated', {
        roomId,
        recommendation: {
          vocabulary: recommendation.vocabulary,
          conversationPrompts: recommendation.conversationPrompts,
          grammarTips: recommendation.grammarTips,
          aiSuggestedQuestions: recommendation.aiSuggestedQuestions,
          levelName: room.levelName,
          levelId: room.levelId,
        }
      });
      return;
    }

    const [startLevel] = await db.select().from(levels).where(eq(levels.id, room.levelId));
    if (!startLevel) return;

    const [currentLevel] = await db.select()
      .from(levels)
      .where(and(
        eq(levels.language, startLevel.language),
        eq(levels.stage, startLevel.stage),
        eq(levels.subLevel, room.currentSubLevel)
      ));

    if (currentLevel) {
      const content = JSON.parse(currentLevel.contentJson);
      io.to(roomId).emit('ai-recommendation-updated', {
        roomId,
        recommendation: {
          vocabulary: content.vocabulary,
          conversationPrompts: content.conversationPrompts,
          grammarTips: content.grammarTips,
          aiSuggestedQuestions: content.aiSuggestedQuestions,
          levelName: currentLevel.name,
          levelId: currentLevel.id,
        }
      });
    }
  } catch (err) {
    console.error('[roomService] Error in fetchAndEmitRecommendations:', err);
  }
}

export function getActiveRooms(): Room[] {
  return Array.from(activeRooms.values()).map(r => r.room);
}

let ioInstance: Server;
export function setIO(io: Server) { ioInstance = io; }

// Background timer to increment speaking time for active speakers
setInterval(() => {
  for (const [, roomData] of activeRooms.entries()) {
    let updated = false;
    for (const p of roomData.room.participants) {
      if (!p.isMuted && p.isSpeaking) {
        p.speakingDurationSec = (p.speakingDurationSec || 0) + 1;
        updated = true;
      }
    }
    if (updated && ioInstance) {
      ioInstance.to(roomData.room.id).emit('room-updated', { room: roomData.room });
    }
  }
}, 1000);
