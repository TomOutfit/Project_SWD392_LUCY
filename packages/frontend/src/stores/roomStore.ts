// src/stores/roomStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Room, Participant, ContentPin } from '@/types/index';

interface RoomState {
  socket: Socket | null;
  currentRoom: Room | null;
  participants: Participant[];
  handQueue: Participant[];
  isConnected: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  pinnedContent: ContentPin | null;
  isRecording: boolean;
  recordingId: string | null;
  pendingRoomId: string | null;
  giftEvents: Array<{ id: string; senderName: string; senderPersonaId: number; giftType: string; amount: number; recipientName: string }>;
  recommendation: {
    vocabulary: string[];
    conversationPrompts: string[];
    grammarTips: string[];
    aiSuggestedQuestions: string[];
    levelName: string;
    levelId: number;
  } | null;

  connectSocket: (userId: number, userName: string, personaId: number, role: string, pendingRoomId?: string) => void;
  disconnectSocket: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  handRaise: () => void;
  handLower: () => void;
  grantSpeak: (participantId: number) => void;
  revokeSpeak: (participantId: number) => void;
  toggleMute: () => void;
  pinContent: (title: string, url: string, type: 'vocabulary' | 'grammar' | 'conversation' | 'pdf') => void;
  startRecording: () => void;
  stopRecording: () => void;
  closeRoom: () => void;
  clearGiftEvents: () => void;
  forceStageTransition: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  socket: null,
  currentRoom: null,
  participants: [],
  handQueue: [],
  isConnected: false,
  isMuted: true,
  isSpeaking: false,
  handRaised: false,
  pinnedContent: null,
  isRecording: false,
  recordingId: null,
  pendingRoomId: null,
  giftEvents: [],
  recommendation: null,

  connectSocket: (userId, userName, personaId, role, pendingRoomId) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) return;
    if (pendingRoomId) set({ pendingRoomId });

    const socket = io('http://localhost:3001', {
      auth: { userId, userName, personaId, role },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ socket, isConnected: true });
      const roomToJoin = pendingRoomId || get().pendingRoomId;
      if (roomToJoin) {
        socket.emit('join-room', { roomId: roomToJoin, user: socket.auth });
        set({ pendingRoomId: null });
      }
    });
    socket.on('disconnect', () => set({ isConnected: false }));

    socket.on('room-joined', ({ room }: { room: Room }) => {
      set({ currentRoom: room, participants: room.participants || [], pinnedContent: room.pinnedContent });
    });

    socket.on('participant-joined', ({ participant }: { participant: Participant }) => {
      set((s) => ({ participants: [...s.participants, participant] }));
    });

    socket.on('participant-left', ({ oderId }: { oderId: number }) => {
      set((s) => ({ participants: s.participants.filter((p) => p.oderId !== oderId) }));
    });

    socket.on('hand-queue-updated', ({ queue }: { queue: Participant[] }) => {
      set({ handQueue: queue });
    });

    socket.on('room-updated', ({ room }: { room: Room }) => {
      set((s) => ({ currentRoom: room, participants: room.participants || s.participants }));
    });

    socket.on('speak-granted', ({ oderId }: { oderId: number }) => {
      set((s) => ({
        participants: s.participants.map((p) => p.oderId === oderId ? { ...p, isMuted: false, isSpeaking: true } : p),
      }));
    });

    socket.on('speak-revoked', ({ oderId }: { oderId: number }) => {
      set((s) => ({
        participants: s.participants.map((p) => p.oderId === oderId ? { ...p, isMuted: true, isSpeaking: false } : p),
      }));
    });

    socket.on('stage-changed', ({ newSubLevel }: { newSubLevel: number }) => {
      set((s) => ({
        currentRoom: s.currentRoom ? { ...s.currentRoom, currentSubLevel: newSubLevel } : null,
      }));
    });

    socket.on('gift-received', (event: { senderName: string; senderPersonaId: number; giftType: string; amount: number; recipientName: string }) => {
      const id = crypto.randomUUID();
      set((s) => ({ giftEvents: [...s.giftEvents, { ...event, id }] }));
      setTimeout(() => {
        set((s) => ({ giftEvents: s.giftEvents.filter((e) => e.id !== id) }));
      }, 4000);
    });

    socket.on('pinned-content-updated', ({ pin }: { pin: ContentPin | null }) => {
      set({ pinnedContent: pin });
    });

    socket.on('recording-started', ({ recordingId }: { recordingId: string }) => {
      set({ isRecording: true, recordingId });
    });

    socket.on('recording-stopped', () => {
      set({ isRecording: false, recordingId: null });
    });

    socket.on('room-closed', () => {
      set({ currentRoom: null, participants: [], handQueue: [], recommendation: null });
    });

    socket.on('ai-recommendation-updated', ({ recommendation }) => {
      set({ recommendation });
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('[Socket error]', message);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null, isConnected: false, currentRoom: null, participants: [], handQueue: [], recommendation: null });
  },

  joinRoom: (roomId) => {
    const socket = get().socket;
    if (!socket) return;
    socket.emit('join-room', { roomId, user: socket.auth });
  },

  leaveRoom: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('leave-room', { roomId: currentRoom.id });
    }
    set({ currentRoom: null, participants: [], handQueue: [], isMuted: true, isSpeaking: false, handRaised: false, recommendation: null });
  },

  handRaise: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('hand-raise', { roomId: currentRoom.id });
      set({ handRaised: true });
    }
  },

  handLower: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('hand-lower', { roomId: currentRoom.id });
      set({ handRaised: false });
    }
  },

  grantSpeak: (participantId) => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('grant-speak', { roomId: currentRoom.id, participantId });
    }
  },

  revokeSpeak: (participantId) => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('revoke-speak', { roomId: currentRoom.id, participantId });
    }
  },

  toggleMute: () => {
    const { socket, currentRoom, isMuted } = get();
    if (socket && currentRoom) {
      socket.emit('toggle-mute', { roomId: currentRoom.id, muted: !isMuted });
      set({ isMuted: !isMuted });
    }
  },

  pinContent: (title, url, type) => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('pin-content', { roomId: currentRoom.id, content: { title, url, type } });
    }
  },

  startRecording: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('start-recording', { roomId: currentRoom.id });
    }
  },

  stopRecording: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('stop-recording', { roomId: currentRoom.id });
    }
  },

  closeRoom: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('close-room', { roomId: currentRoom.id });
    }
    set({ currentRoom: null, participants: [], handQueue: [], recommendation: null });
  },

  forceStageTransition: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('force-stage-transition', { roomId: currentRoom.id });
    }
  },

  clearGiftEvents: () => set({ giftEvents: [] }),
}));
