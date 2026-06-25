// src/stores/roomStore.ts
/// <reference types="vite/client" />
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { Room, Participant, ContentPin } from '@/types/index';

function getAgoraClient(): any {
  if (!(globalThis as any).__lucyAgoraClient) {
    (globalThis as any).__lucyAgoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  }
  return (globalThis as any).__lucyAgoraClient;
}

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
  joiningRoomId: string | null;
  latencyMs: number | null;
  latencyTimer: number | null;
  giftEvents: Array<{ id: string; senderName: string; senderPersonaId: number; giftType: string; amount: number; recipientName: string }>;
  recommendation: {
    vocabulary: string[];
    conversationPrompts: string[];
    grammarTips: string[];
    aiSuggestedQuestions: string[];
    levelName: string;
    levelId: number;
  } | null;
  selectedMicrophoneId: string | null;
  agoraReady: boolean;

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
  startLatencyProbe: () => void;
  stopLatencyProbe: () => void;
  setSelectedMicrophone: (id: string) => void;
  switchMicrophone: (id: string) => Promise<void>;
  joinAgoraChannel: (userId: number) => Promise<void>;
  leaveAgoraChannel: () => Promise<void>;
  getLocalVolumeLevel: () => number;
  getLocalMediaStreamTrack: () => MediaStreamTrack | null;
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
  joiningRoomId: null,
  latencyMs: null,
  latencyTimer: null,
  giftEvents: [],
  recommendation: null,
  selectedMicrophoneId: null,
  agoraReady: false,

  connectSocket: (userId, userName, personaId, role, pendingRoomId) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      if (pendingRoomId) {
        get().joinRoom(pendingRoomId);
      }
      return;
    }
    if (pendingRoomId) set({ joiningRoomId: pendingRoomId });

    const socket = io('http://localhost:3001', {
      auth: { userId, userName, personaId, role },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ socket, isConnected: true });
      const roomToJoin = get().joiningRoomId;
      if (roomToJoin) {
        set({ joiningRoomId: null });
        socket.emit('join-room', { roomId: roomToJoin, user: socket.auth });
      }
      // We no longer use socket ping for latency. We will use Agora's getRTCStats().RTT for true audio latency.
      set({ isConnected: true });
    });
    socket.on('disconnect', () => {
      set({ isConnected: false, latencyMs: null });
    });

    socket.on('room-joined', ({ room }: { room: Room }) => {
      set({ currentRoom: room, participants: room.participants || [], pinnedContent: room.pinnedContent, joiningRoomId: null });
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
      if (oderId === (socket.auth as any)?.userId) {
        try {
          const track = (getAgoraClient() as any).__localAudioTrack;
          if (track) track.setEnabled(true);
        } catch {}
      }
      set((s) => ({
        participants: s.participants.map((p) => p.oderId === oderId ? { ...p, isMuted: false, isSpeaking: true } : p),
      }));
    });

    socket.on('speak-revoked', ({ oderId }: { oderId: number }) => {
      if (oderId === (socket.auth as any)?.userId) {
        try {
          const track = (getAgoraClient() as any).__localAudioTrack;
          if (track) track.setEnabled(false);
        } catch {}
      }
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

    socket.on('room-closed', async () => {
      await get().leaveAgoraChannel();
      set({ currentRoom: null, participants: [], handQueue: [], recommendation: null });
    });

    socket.on('ai-recommendation-updated', ({ recommendation }) => {
      set({ recommendation });
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('[Socket error]', message);
    });
  },

  disconnectSocket: async () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    get().stopLatencyProbe();
    await get().leaveAgoraChannel();
    set({ socket: null, isConnected: false, currentRoom: null, participants: [], handQueue: [], recommendation: null, joiningRoomId: null, latencyMs: null });
  },

  joinRoom: (roomId) => {
    const { socket, joiningRoomId } = get();
    if (!socket) {
      set({ joiningRoomId: roomId });
      return;
    }
    if (joiningRoomId === roomId) return;
    if (!socket.connected) {
      set({ joiningRoomId: roomId });
      return;
    }
    set({ joiningRoomId: roomId });
    socket.emit('join-room', { roomId, user: socket.auth });
  },

  leaveRoom: async () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('leave-room', { roomId: currentRoom.id });
    }
    await get().leaveAgoraChannel();
    set({ currentRoom: null, participants: [], handQueue: [], isMuted: true, isSpeaking: false, handRaised: false, recommendation: null, joiningRoomId: null });
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
      const newMutedState = !isMuted;
      socket.emit('toggle-mute', { roomId: currentRoom.id, muted: newMutedState });
      set({ isMuted: newMutedState });
      try {
        const track = (getAgoraClient() as any).__localAudioTrack;
        if (track) track.setEnabled(!newMutedState);
      } catch {}
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
    set({ currentRoom: null, participants: [], handQueue: [], recommendation: null, joiningRoomId: null });
  },

  forceStageTransition: () => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('force-stage-transition', { roomId: currentRoom.id });
    }
  },

  clearGiftEvents: () => set({ giftEvents: [] }),

  startLatencyProbe: () => {
    const s = get().socket;
    if (!s?.connected) return;
    const timer = window.setInterval(() => {
      try {
        const start = Date.now();
        s.emit('ping', () => {
          set({ latencyMs: Date.now() - start });
        });
      } catch { /* noop */ }
    }, 2000);
    set({ latencyTimer: timer, latencyMs: null });
  },

  stopLatencyProbe: () => {
    const t = get().latencyTimer;
    if (t) window.clearInterval(t);
    set({ latencyTimer: null, latencyMs: null });
  },

  setSelectedMicrophone: (id: string) => set({ selectedMicrophoneId: id }),

  switchMicrophone: async (id: string) => {
    set({ selectedMicrophoneId: id });
    try {
      const track = (getAgoraClient() as any).__localAudioTrack;
      if (track) {
        await track.setDevice(id);
      }
    } catch (err) {
      console.error('[Agora] Failed to switch device:', err);
    }
  },

  getLocalVolumeLevel: () => {
    try {
      const client = getAgoraClient();
      const track = (client as any).__localAudioTrack;
      if (track) return track.getVolumeLevel() * 100;
    } catch {
      // noop
    }
    return 0;
  },

  getLocalMediaStreamTrack: () => {
    try {
      const client = getAgoraClient();
      const track = (client as any).__localAudioTrack;
      if (track && typeof track.getMediaStreamTrack === 'function') {
        return track.getMediaStreamTrack();
      }
    } catch {
      // noop
    }
    return null;
  },

  joinAgoraChannel: async (userId: number) => {
    try {
      const { currentRoom, isMuted } = get();
      if (!currentRoom) return;

      const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
      if (!appId || appId === 'YOUR_AGORA_APP_ID') {
        console.warn('[Agora] VITE_AGORA_APP_ID not set — skipping WebRTC join.');
        return;
      }

      const client = getAgoraClient();

      // Leave if already connected
      if ((client.connectionState as string) !== 'DISCONNECTED') {
        await client.leave();
      }

      const channelName = String(currentRoom.id);
      const uid = userId;

      // Fetch Agora token from backend
      let token: string | null = null;
      try {
        const res = await fetch(`/api/agora/token?channelName=${encodeURIComponent(channelName)}&uid=${uid}`);
        if (res.ok) {
          const data = await res.json();
          token = data.token ?? null;
        }
      } catch {
        console.warn('[Agora] Token fetch failed — joining without token (test mode).');
      }

      await client.join(appId, channelName, token || undefined, uid);

      const { selectedMicrophoneId } = get();

      // Create and publish local microphone track
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(
        selectedMicrophoneId ? { microphoneId: selectedMicrophoneId } : undefined
      );
      localAudioTrack.setEnabled(!isMuted);
      await client.publish(localAudioTrack);

      // Listen for remote audio tracks
      client.on('user-published', async (remoteUser: any, mediaType: string) => {
        if (mediaType !== 'audio') return;
        await client.subscribe(remoteUser, mediaType);
        remoteUser.audioTrack?.play();
      });

      // Store reference for cleanup
      (client as any).__localAudioTrack = localAudioTrack;
      
      // Start True Audio Latency Probe
      const timer = window.setInterval(() => {
        try {
          if (client.connectionState === 'CONNECTED') {
            const stats = client.getRTCStats();
            if (stats && typeof stats.RTT === 'number') {
              set({ latencyMs: stats.RTT });
            }
          }
        } catch {}
      }, 2000);
      set({ agoraReady: true, latencyTimer: timer as any });
    } catch (err) {
      console.error('[Agora] Failed to join channel:', err);
    }
  },

  leaveAgoraChannel: async () => {
    set({ agoraReady: false });
    const { latencyTimer } = get();
    if (latencyTimer) {
      window.clearInterval(latencyTimer);
      set({ latencyTimer: null, latencyMs: null });
    }
    try {
      const client = getAgoraClient();
      if ((client.connectionState as string) !== 'DISCONNECTED') {
        const localTrack = (client as any).__localAudioTrack;
        if (localTrack) {
          localTrack.close();
          delete (client as any).__localAudioTrack;
        }
        await client.leave();
      }
      set({ isSpeaking: false });
    } catch (err) {
      console.error('[Agora] Failed to leave channel:', err);
    }
  },
}));
