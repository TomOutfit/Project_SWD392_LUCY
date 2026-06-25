// src/services/roomService.ts
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Language, RoomState, Participant, ContentPin, Room } from '../types/index.js';
import { RoomStageSubject, SocketNotifierObserver, DbPersistenceObserver, MaterialRecommenderObserver } from './observer.js';
import db from '../db/index.js';
import { levels } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

// In-memory room state (production: use Redis)
const activeRooms = new Map<string, {
  room: Room;
  stageTimer?: NodeJS.Timeout;
  subject?: RoomStageSubject;
  recording?: { id: string; startedAt: Date; creatorId: number };
  handQueue: Participant[];
}>();

export function registerSocketHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;
  const userName = socket.data.userName;
  const userPersonaId = socket.data.userPersonaId;
  const userRole = socket.data.userRole;

  socket.on('join-room', ({ roomId, user }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return socket.emit('error', { message: 'Room not found' });

    const existing = roomData.room.participants.find(p => p.oderId === user.id);

    if (!existing) {
      const participant: Participant = {
        oderId: user.id, oderName: user.name, oderPersonaId: user.personaId,
        oderRole: user.role, joinedAt: new Date().toISOString(),
        isMuted: true, isSpeaking: false, handRaised: false,
      };
      roomData.room.participants.push(participant);
      roomData.room.participantCount = roomData.room.participants.length;
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
    if (p) { p.isMuted = muted; }
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
    roomData.handQueue = roomData.handQueue.filter(q => q.oderId !== participantId);

    io.to(roomId).emit('speak-granted', { roomId, oderId: participantId });
    io.to(roomId).emit('hand-queue-updated', { roomId, queue: roomData.handQueue });
    io.to(roomId).emit('room-updated', { room: roomData.room });
  });

  socket.on('revoke-speak', ({ roomId, participantId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    const p = roomData.room.participants.find(p => p.oderId === participantId);
    if (p) { p.isMuted = true; p.isSpeaking = false; }

    io.to(roomId).emit('speak-revoked', { roomId, oderId: participantId });
    io.to(roomId).emit('room-updated', { room: roomData.room });
  });

  socket.on('pin-content', ({ roomId, content }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    const pin: ContentPin = {
      id: uuidv4(), title: content.title, url: content.url,
      type: content.type, pinnedBy: socket.data.userId, pinnedAt: new Date().toISOString(),
    };
    roomData.room.pinnedContent = pin;

    io.to(roomId).emit('pinned-content-updated', { roomId, pin });
  });

  socket.on('start-recording', ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    if (roomData.recording) return;

    const recordingId = uuidv4();
    roomData.recording = { id: recordingId, startedAt: new Date(), creatorId: socket.data.userId };

    io.to(roomId).emit('recording-started', { roomId, recordingId });
  });

  socket.on('stop-recording', ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    if (!roomData.recording) return;

    const podcastId = uuidv4();
    const duration = Math.floor((Date.now() - roomData.recording.startedAt.getTime()) / 1000);
    roomData.recording = undefined;

    io.to(roomId).emit('recording-stopped', { roomId, podcastId });
  });

  socket.on('close-room', ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;

    if (roomData.stageTimer) clearInterval(roomData.stageTimer);

    io.to(roomId).emit('room-closed', { roomId });
    io.in(roomId).socketsLeave(roomId);
    activeRooms.delete(roomId);
  });

  socket.on('force-stage-transition', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData || roomData.room.hostId !== socket.data.userId) return;
    await roomData.subject?.transitionToNextSubLevel(roomData.room);
  });

  socket.on('get-recommendations', async ({ roomId }) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;
    await fetchAndEmitRecommendations(io, roomId, roomData.room);
  });

  socket.on('disconnect', () => {
    if (socket.data.currentRoom) {
      handleLeaveRoom(io, socket, socket.data.currentRoom);
    }
  });
}

function handleLeaveRoom(io: Server, socket: Socket, roomId: string) {
  const roomData = activeRooms.get(roomId);
  if (!roomData) return;

  const oderId = socket.data.userId;
  roomData.room.participants = roomData.room.participants.filter(p => p.oderId !== oderId);
  roomData.room.participantCount = roomData.room.participants.length;
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
  };

  const subject = new RoomStageSubject(id);
  subject.attach(new SocketNotifierObserver(ioInstance));
  subject.attach(new DbPersistenceObserver());
  subject.attach(new MaterialRecommenderObserver(ioInstance));

  // Set up auto stage progression (every 10 minutes)
  const stageTimer = setInterval(async () => {
    const rd = activeRooms.get(id);
    if (!rd || rd.room.state === RoomState.CLOSED) {
      clearInterval(stageTimer);
      return;
    }
    await rd.subject?.transitionToNextSubLevel(rd.room);
  }, 10 * 60 * 1000); // 10 minutes per sub-level

  activeRooms.set(id, { room: fullRoom, stageTimer, subject, handQueue: [] });
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
