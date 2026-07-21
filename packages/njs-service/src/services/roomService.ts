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
import { appendLatencyRowToMd } from '../utils/telemetry.js';

// ── Latency helpers ───────────────────────────────────────────────────────────

function appendWsLatency(
  now: Date,
  userId: number | string,
  userRole: string,
  latencyMs: number,
  clientIp: string,
): void {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const logLine = `[${now.toISOString()}] [${clientIp}] User: ${userId} (${userRole}) - Socket.io Ping RTT: ${latencyMs}ms\n`;
  try { fs.appendFileSync(path.join(logsDir, 'websocket_latency.log'), logLine); } catch { /* non-fatal */ }

  const endpointStr = `\`WebSocket Ping (User: ${userId})\``;
  appendLatencyRowToMd(now, endpointStr, Number(latencyMs), 0, Number(latencyMs), clientIp);
}

// ── In-memory room state ───────────────────────────────────────────────────────

const activeRooms = new Map<string, {
  room: Room;
  speakingTimer?: NodeJS.Timeout; // only accumulates activeSpeakingTimeSec, never auto-transitions
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

  // ── Join flow ───────────────────────────────────────────────────────────────

  socket.on('knock-room', ({ roomId, user }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return socket.emit('knock-failed', { message: 'Room not found' });

    const isAlreadyParticipant = roomData.room.participants.some(p => p.oderId === user.id);
    if (roomData.room.hostId === user.id || isAlreadyParticipant) {
      return socket.emit('knock-approved', { roomId });
    }

    const hostSockets = roomData.userSockets?.get(roomData.room.hostId);
    if (!hostSockets || hostSockets.size === 0) {
      return socket.emit('knock-failed', { message: 'Host is not in the lobby yet. Please wait for the host to join.' });
    }

    hostSockets.forEach(hSockId => {
      io.to(hSockId).emit('join-request-received', {
        roomId,
        user: { id: user.id, name: userName || 'Anonymous Student', personaId: userPersonaId, role: userRole },
        socketId: socket.id,
      });
    });

    socket.emit('knock-waiting');
  });

  socket.on('approve-knock', ({ roomId, targetSocketId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) targetSocket.emit('knock-approved', { roomId });
  });

  socket.on('deny-knock', ({ roomId, targetSocketId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) targetSocket.emit('knock-denied', { roomId });
  });

  socket.on('join-room', ({ roomId, user }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return socket.emit('error', { message: 'Room not found' });

    if (!roomData.userSockets) roomData.userSockets = new Map();
    let socketsSet = roomData.userSockets.get(user.id) ?? new Set();
    const isNewUserConnection = socketsSet.size === 0;
    socketsSet.add(socket.id);
    roomData.userSockets.set(user.id, socketsSet);

    const existing = roomData.room.participants.find(p => p.oderId === user.id);

    if (!existing) {
      const isHost = roomData.room.hostId === user.id;
      const participant: Participant = {
        oderId: user.id, oderName: userName, oderPersonaId: user.personaId,
        oderRole: user.role, joinedAt: new Date().toISOString(),
        isMuted: !isHost, isSpeaking: isHost, handRaised: false,
        speakingDurationSec: 0, activeSpeakingTimeSec: 0,
        speakGranted: isHost,
      };
      roomData.room.participants.push(participant);
      roomData.room.participantCount = roomData.room.participants.length;

      db.update(roomsTable)
        .set({ participantCount: roomData.room.participantCount })
        .where(eq(roomsTable.id, roomId))
        .catch(err => console.error('[roomService] Failed to update participantCount:', err));

      socket.join(roomId);
      socket.data.currentRoom = roomId;
      socket.emit('room-joined', { room: roomData.room, userId: user.id });
      socket.to(roomId).emit('participant-joined', { roomId, participant });
      socket.to(roomId).emit('room-updated', { room: roomData.room });
      socket.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
      fetchAndEmitRecommendations(io, roomId, roomData.room);
    } else {
      socket.join(roomId);
      socket.data.currentRoom = roomId;
      socket.emit('room-joined', { room: roomData.room, userId: user.id });
      if (isNewUserConnection) io.to(roomId).emit('room-updated', { room: roomData.room });
    }
  });

  socket.on('leave-room', ({ roomId }) => handleLeaveRoom(io, socket, roomId));

  // ── Hand management ────────────────────────────────────────────────────────

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

  // ── Speaking control ────────────────────────────────────────────────────────

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

  // ── Content ─────────────────────────────────────────────────────────────────

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

  socket.on('get-recommendations', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;
    await fetchAndEmitRecommendations(io, roomId, roomData.room);
  });

  // ── Recording ────────────────────────────────────────────────────────────────

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

    try {
      await db.insert(podcasts).values({
        id: podcastId, roomId, roomName: roomData.room.name,
        creatorId: recording.creatorId, creatorName: roomData.room.hostName,
        title: `${roomData.room.name} — Session Recording`, durationSec, fileUrl: '',
        language: roomData.room.language, levelName: roomData.room.levelName,
        createdAt: new Date().toISOString(), listenCount: 0,
      });
    } catch (err) {
      console.error('[roomService] Failed to persist podcast metadata:', err);
      return;
    }

    io.to(roomId).emit('recording-stopped', { roomId, podcastId });
  });

  // ── Room lifecycle ──────────────────────────────────────────────────────────

  /**
   * Host manually triggers a stage transition.
   * No automatic countdown — Host has full control.
   */
  socket.on('force-stage-transition', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    await roomData.subject?.transitionToNextSubLevel(roomData.room);
  });

  socket.on('close-room', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    if (roomData.speakingTimer) clearInterval(roomData.speakingTimer);
    io.to(roomId).emit('room-closed', { roomId });
    io.in(roomId).socketsLeave(roomId);
    activeRooms.delete(roomId);
    try {
      await db.update(roomsTable).set({ isLive: false }).where(eq(roomsTable.id, roomId));
    } catch (err) {
      console.error('[roomService] Failed to mark room as closed in DB:', err);
    }
  });

  // ── Gifts ───────────────────────────────────────────────────────────────────

  socket.on('send-gift', ({ roomId, giftType, amount, recipientId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;
    const recipient = roomData.room.participants.find(p => p.oderId === recipientId);
    const recipientName = recipient ? recipient.oderName : `Anonymous Learner`;
    io.to(roomId).emit('gift-received', {
      id: uuidv4(), senderName: socket.data.userName, senderPersonaId: socket.data.userPersonaId,
      giftType, amount, recipientName, recipientId,
    });
  });

  // ── Host controls ──────────────────────────────────────────────────────────

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
      .catch(err => console.error('[roomService] Failed to update participantCount:', err));
    roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== userIdToKick);

    io.to(roomId).emit('room-left', { roomId, oderId: userIdToKick, kicked: true });
    io.to(roomId).emit('room-updated', { room: roomData.room });
    io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    if (socket.data.currentRoom) handleLeaveRoom(io, socket, socket.data.currentRoom);
  });

  // ── Latency telemetry ───────────────────────────────────────────────────────

  socket.on('ping', (cb) => { try { cb({ ok: true, t: Date.now() }); } catch { /* noop */ } });

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

// ── Leave handler ─────────────────────────────────────────────────────────────

function handleLeaveRoom(io: Server, socket: Socket, roomId: string) {
  const roomData = activeRooms.get(roomId);
  if (!roomData) return;

  const oderId = socket.data.userId;

  if (roomData.userSockets) {
    const socketsSet = roomData.userSockets.get(oderId);
    if (socketsSet) {
      socketsSet.delete(socket.id);
      if (socketsSet.size > 0) {
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
    .catch(err => console.error('[roomService] Failed to update participantCount:', err));
  roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== oderId);

  socket.leave(roomId);
  socket.data.currentRoom = undefined;

  io.to(roomId).emit('room-left', { roomId, oderId });
  io.to(roomId).emit('room-updated', { room: roomData.room });
  io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
}

// ── Room factory ──────────────────────────────────────────────────────────────

export function createRoomInMemory(roomData: Omit<Room, 'id' | 'participants' | 'pinnedContent' | 'participantCount'>): string {
  let id = '';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  do {
    const rand = (len: number) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    id = `${rand(3)}-${rand(4)}-${rand(3)}`;
  } while (activeRooms.has(id));

  const fullRoom: Room = {
    ...roomData,
    id,
    participants: [],
    pinnedContent: null,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    activeSpeakingTimeSec: 0,
  };

  const subject = new RoomStageSubject(id);
  subject.attach(new SocketNotifierObserver(ioInstance));
  subject.attach(new DbPersistenceObserver());
  subject.attach(new MaterialRecommenderObserver(ioInstance));

  /**
   * Background ticker: accumulates activeSpeakingTimeSec while anyone is speaking.
   * NO auto-transition — Host decides when to move to the next sub-level.
   */
  const speakingTimer = setInterval(() => {
    const rd = activeRooms.get(id);
    if (!rd || rd.room.state === RoomState.CLOSED) {
      clearInterval(speakingTimer);
      return;
    }

    const room = rd.room;
    const hasActiveSpeaker = room.participants.some(p => !p.isMuted && p.isSpeaking);

    if (hasActiveSpeaker) {
      // Increment room-level active speaking counter
      room.activeSpeakingTimeSec = (room.activeSpeakingTimeSec ?? 0) + 1;

      // Increment per-participant active speaking counter
      for (const p of room.participants) {
        if (!p.isMuted && p.isSpeaking) {
          p.activeSpeakingTimeSec = (p.activeSpeakingTimeSec ?? 0) + 1;
        }
      }
    }
    // NOTE: when no one is speaking, the counter simply pauses — no penalty.

  }, 1000);

  activeRooms.set(id, { room: fullRoom, speakingTimer, subject, handQueue: [], userSockets: new Map() });
  return id;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export async function forceNextSublevel(roomId: string): Promise<boolean> {
  const roomData = activeRooms.get(roomId);
  if (!roomData) return false;
  await roomData.subject?.transitionToNextSubLevel(roomData.room);
  return true;
}

export function getActiveRooms(): Room[] {
  return Array.from(activeRooms.values()).map(r => r.room);
}

let ioInstance: Server;
export function setIO(io: Server) { ioInstance = io; }

// ── Legacy speaking duration tracker (legacy wall-clock seconds while unmuted) ─

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

// ── AI Recommendations ───────────────────────────────────────────────────────

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
