// src/services/roomService.ts
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Language, RoomState, Participant, ContentPin, Room } from '../types/index.js';
import { RoomStageSubject, SocketNotifierObserver, DbPersistenceObserver, MaterialRecommenderObserver } from './observer.js';
import db from '../db/index.js';
import { levels, rooms as roomsTable, podcasts, studySessions } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

import { generateRecommendationsFromPin } from './aiService.js';
import { appendLatencyRowToMd } from '../utils/telemetry.js';

const NET_SERVICE_URL = process.env.NET_SERVICE_URL || 'http://localhost:5001';

async function recordXpToNetService(userId: number, xpEarned: number, roomId: string): Promise<void> {
  if (xpEarned <= 0) return;
  try {
    await fetch(`${NET_SERVICE_URL}/api/xp/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount: xpEarned,
        roomId,
        description: `Study session: ${roomId}`,
      }),
    });
  } catch (err) {
    console.error('[roomService] Failed to record XP to net-service:', err);
  }
}

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
  speakingTimer?: NodeJS.Timeout; // only accumulates activeSpeakingTimeSec when language matches room.language
  subject?: RoomStageSubject;
  recording?: { id: string; startedAt: Date; creatorId: number };
  handQueue: Participant[];
  userSockets: Map<number, Set<string>>;
  userDetectedLanguage: Map<number, string>; // userId → detected BCP-47 language tag
  pendingCountdown: Map<number, number>; // userId → pending seconds awaiting language detection
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
        oderId: user.id, oderName: user.name, oderPersonaId: user.personaId,
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

      // Sync socket identity to API userId so close-room emit uses correct IDs
      socket.data.userId = user.id;
      socket.data.userName = user.name;

      socket.join(roomId);
      socket.data.currentRoom = roomId;
      socket.emit('room-joined', { room: roomData.room, userId: user.id });
      socket.to(roomId).emit('participant-joined', { roomId, participant });
      socket.to(roomId).emit('room-updated', { room: roomData.room });
      socket.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
      fetchAndEmitRecommendations(io, roomId, roomData.room);
    } else {
      // Sync socket identity to API userId so close-room emit uses correct IDs
      socket.data.userId = user.id;
      socket.data.userName = user.name;

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

    const room = roomData.room;
    const now = new Date().toISOString();
    const closedAt = now;

    // Compute total session duration
    const createdAt = room.createdAt ?? now;
    const totalDurationSec = Math.max(0,
      Math.floor((new Date(closedAt).getTime() - new Date(createdAt).getTime()) / 1000)
    );

    // Build participant records with XP earned
    const participants = room.participants.map(p => ({
      oderId: p.oderId,
      oderName: p.oderName,
      oderRole: p.oderRole,
      activeSpeakingTimeSec: p.activeSpeakingTimeSec ?? 0,
      validatedSpeakingTimeSec: p.validatedSpeakingTimeSec ?? 0,
      xpEarned: (p.validatedSpeakingTimeSec ?? 0) * 2, // XP only from language-validated seconds
    }));
    console.log(`[roomService] close-room: roomId=${roomId}, hostId=${room.hostId}, participants count=${participants.length}`, participants.map(p => ({ id: p.oderId, name: p.oderName, xp: p.xpEarned })));

    // Record XP to net-service for each participant (fire-and-forget, non-blocking)
    for (const p of participants) {
      recordXpToNetService(p.oderId, p.xpEarned, roomId);
    }

    // Persist study session to DB (survives room closure)
    try {
      await db.insert(studySessions).values({
        id: uuidv4(),
        roomId,
        hostId: room.hostId,
        hostName: room.hostName,
        language: room.language,
        levelName: room.levelName,
        participantsJson: JSON.stringify(participants),
        totalDurationSec,
        createdAt,
        closedAt,
      });
    } catch (persistErr) {
      console.error('[roomService] Failed to persist study session:', persistErr);
    }

    // ── Emit XP summary to every participant before closing ────────────────────
    // Emit to ALL sockets in the room (including the host sender) so every
    // client receives the batch BEFORE room-closed arrives and disconnects them.
    const xpSummary = participants.map(p => ({
      oderId: p.oderId,
      oderName: p.oderName,
      validatedSpeakingTimeSec: p.validatedSpeakingTimeSec,
      xpEarned: p.xpEarned,
    }));
    io.to(roomId).emit('xp-earned-batch', xpSummary);

    io.to(roomId).emit('room-closed', { roomId });
    io.in(roomId).socketsLeave(roomId);
    activeRooms.delete(roomId);
    try {
      await db.update(roomsTable).set({ isLive: false }).where(eq(roomsTable.id, roomId));
    } catch (err) {
      console.error('[roomService] Failed to mark room as closed in DB:', err);
    }
  });

  // ── Language Detection ─────────────────────────────────────────────────────

  /**
   * Called by the frontend when Web Speech API detects the language the user is speaking.
   * Language must match the room's target language to be counted toward speaking time.
   *
   * @param lang  BCP-47 language tag (e.g. 'en-US', 'zh-CN', 'ja-JP')
   */
  socket.on('speaking-language-detected', ({ roomId, lang }: { roomId: string; lang: string }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;

    const odUserId = socket.data.userId;
    const roomLangPrefix = { EN: 'en', ZH: 'zh', JA: 'ja' }[roomData.room.language] ?? '';

    // Store the detected language for this user
    roomData.userDetectedLanguage.set(odUserId, lang);

    // Credit pending seconds whenever the language matches (handles user stop/restart cycles)
    if (roomLangPrefix && lang.toLowerCase().startsWith(roomLangPrefix.toLowerCase())) {
      const pending = roomData.pendingCountdown.get(odUserId) ?? 0;
      if (pending > 0) {
        const participant = roomData.room.participants.find(p => p.oderId === odUserId);
        if (participant) {
          // Credit validated (XP) time — these seconds were spoken before detection arrived
          participant.validatedSpeakingTimeSec = (participant.validatedSpeakingTimeSec ?? 0) + pending;
          // eslint-disable-next-line no-console
          console.log(`[roomService] Credited ${pending} validated seconds for user ${odUserId} (lang match: ${lang})`);
        }
        roomData.pendingCountdown.delete(odUserId);
      }
    } else {
      // Wrong language — discard pending seconds silently (they don't count toward XP)
      roomData.pendingCountdown.delete(odUserId);
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
   * Maps room language code to BCP-47 prefix for language detection.
   * Room 'EN' → 'en', Room 'ZH' → 'zh', Room 'JA' → 'ja'
   */
  const ROOM_LANG_PREFIX: Record<string, string> = {
    EN: 'en',
    ZH: 'zh',
    JA: 'ja',
  };

  /**
   * Background ticker: accumulates activeSpeakingTimeSec ONLY when the participant
   * is speaking AND their detected language matches the room's target language.
   * If language detection has not yet occurred, the second is counted in a "pending"
   * buffer and will be credited / discarded once the first detection result arrives.
   */
  const speakingTimer = setInterval(() => {
    const rd = activeRooms.get(id);
    if (!rd || rd.room.state === RoomState.CLOSED) {
      clearInterval(speakingTimer);
      return;
    }

    const room = rd.room;
    const roomLangPrefix = ROOM_LANG_PREFIX[room.language] ?? '';

    // Increment room-level total timer (wall-clock, no language check)
    room.activeSpeakingTimeSec = (room.activeSpeakingTimeSec ?? 0) + 1;

    for (const p of room.participants) {
      if (!p.isMuted && p.isSpeaking) {
        // Always count — this is the RAW speaking time shown in the UI
        p.activeSpeakingTimeSec = (p.activeSpeakingTimeSec ?? 0) + 1;

        // Only count toward XP when the detected language matches the room target
        const detected = rd.userDetectedLanguage.get(p.oderId);
        if (detected) {
          const matches = detected.toLowerCase().startsWith(roomLangPrefix.toLowerCase());
          if (matches) {
            p.validatedSpeakingTimeSec = (p.validatedSpeakingTimeSec ?? 0) + 1;
          }
          // else: wrong language — validated time NOT incremented
        } else {
          // First detection not yet arrived — accumulate in pending buffer
          rd.pendingCountdown.set(p.oderId, (rd.pendingCountdown.get(p.oderId) ?? 0) + 1);
        }
      }
    }

  }, 1000);

  activeRooms.set(id, { room: fullRoom, speakingTimer, subject, handQueue: [], userSockets: new Map(), userDetectedLanguage: new Map(), pendingCountdown: new Map() });
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
