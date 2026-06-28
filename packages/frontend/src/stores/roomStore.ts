// src/stores/roomStore.ts
/// <reference types="vite/client" />
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { Room, Participant, ContentPin } from '@/types/index';
import toast from 'react-hot-toast';

function getAgoraClient(): any {
  if (!(globalThis as any).__lucyAgoraClient) {
    (globalThis as any).__lucyAgoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  }
  return (globalThis as any).__lucyAgoraClient;
}

interface LucyMixer {
  context: AudioContext | null;
  dest: MediaStreamAudioDestinationNode | null;
  recorder: MediaRecorder | null;
  chunks: BlobPart[];
}
(globalThis as any).__lucyMixer = { context: null, dest: null, recorder: null, chunks: [] } as LucyMixer;

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
  recordingTime: number;
  recordingTimerInterval: number | null;
  joiningRoomId: string | null;
  latencyMs: number | null;
  latencyTimer: number | null;
  agoraJoining: boolean;
  agoraJoined: boolean;
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
  joinAgoraChannel: (userId: number, roomId: string) => Promise<void>;
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
  recordingTime: 0,
  recordingTimerInterval: null,
  joiningRoomId: null,
  latencyMs: null,
  latencyTimer: null,
  agoraJoining: false,
  agoraJoined: false,
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
      const currentUserId = (socket.auth as any)?.userId;
      if (oderId === currentUserId) {
        // This is the current user - unmute them
        try {
          const track = (getAgoraClient() as any).__localAudioTrack;
          if (track) track.setEnabled(true);
        } catch (err) {
          console.error('[Agora] speak-granted: failed to enable track:', err);
        }
      }
      set((s) => ({
        isMuted: oderId === currentUserId ? false : s.isMuted,
        participants: s.participants.map((p) => p.oderId === oderId ? { ...p, isMuted: false, isSpeaking: true } : p),
      }));
    });

    socket.on('speak-revoked', ({ oderId }: { oderId: number }) => {
      const currentUserId = (socket.auth as any)?.userId;
      if (oderId === currentUserId) {
        // This is the current user - mute them
        try {
          const track = (getAgoraClient() as any).__localAudioTrack;
          if (track) track.setEnabled(false);
        } catch (err) {
          console.error('[Agora] speak-revoked: failed to disable track:', err);
        }
      }
      set((s) => ({
        isMuted: oderId === currentUserId ? true : s.isMuted,
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
      const interval = window.setInterval(() => {
        set((state) => ({ recordingTime: state.recordingTime + 1 }));
      }, 1000);
      set({ isRecording: true, recordingId, recordingTime: 0, recordingTimerInterval: interval as any });
    });

    socket.on('recording-stopped', ({ podcastId }: { podcastId: string }) => {
      const { recordingTimerInterval } = get();
      if (recordingTimerInterval) window.clearInterval(recordingTimerInterval);
      set({ isRecording: false, recordingId: null, recordingTimerInterval: null });

      const mixer = (globalThis as any).__lucyMixer as LucyMixer;
      if (mixer.recorder && mixer.recorder.state !== 'inactive') {
        mixer.recorder.onstop = async () => {
          const blob = new Blob(mixer.chunks, { type: 'audio/webm' });
          mixer.chunks = [];

          const formData = new FormData();
          formData.append('audio', blob, `podcast-${podcastId}.webm`);

          try {
            const res = await fetch(`http://localhost:3001/api/podcasts/${podcastId}/upload`, {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.success) {
              toast.success('Podcast saved successfully!');
            } else {
              toast.error('Failed to upload podcast');
            }
          } catch (err) {
            console.error('Failed to upload podcast', err);
            toast.error('Failed to upload podcast');
          }

          // cleanup
          if (mixer.context) {
            mixer.context.close();
            mixer.context = null;
            mixer.dest = null;
          }
        };
        mixer.recorder.stop();
      }
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
      toast.error(message);
      if (message === 'Room not found') {
        set({ joiningRoomId: null, currentRoom: null });
        window.location.href = '/browse';
      }
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
    const { socket, currentRoom, isMuted, agoraJoined, agoraReady } = get();
    if (socket && currentRoom) {
      const newMutedState = !isMuted;
      socket.emit('toggle-mute', { roomId: currentRoom.id, muted: newMutedState });
      set({ isMuted: newMutedState });

      // Only modify track if Agora is ready
      if (agoraJoined && agoraReady) {
        try {
          const track = (getAgoraClient() as any).__localAudioTrack;
          if (track) {
            track.setEnabled(!newMutedState);
            console.log('[Agora] Mute toggled:', newMutedState ? 'muted' : 'unmuted');
          } else {
            console.warn('[Agora] Toggle mute called but no local audio track exists');
          }
        } catch (err) {
          console.error('[Agora] Failed to toggle mute:', err);
        }
      } else {
        console.warn('[Agora] Toggle mute called but Agora not joined yet');
      }
    }
  },

  pinContent: (title, url, type) => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('pin-content', { roomId: currentRoom.id, content: { title, url, type } });
    }
  },

  startRecording: () => {
    const { socket, currentRoom, agoraJoined } = get();
    if (!socket || !currentRoom || !agoraJoined) return;

    const mixer = (globalThis as any).__lucyMixer as LucyMixer;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    mixer.context = new AudioCtx();
    mixer.dest = mixer.context.createMediaStreamDestination();

    const client = getAgoraClient();

    // Add local track
    const localTrack = (client as any).__localAudioTrack;
    if (localTrack) {
      const stream = new MediaStream([localTrack.getMediaStreamTrack()]);
      const source = mixer.context.createMediaStreamSource(stream);
      source.connect(mixer.dest);
    }

    // Add existing remote tracks
    if (client.remoteUsers) {
      client.remoteUsers.forEach((user: any) => {
        if (user.audioTrack) {
          const stream = new MediaStream([user.audioTrack.getMediaStreamTrack()]);
          const source = mixer.context!.createMediaStreamSource(stream);
          source.connect(mixer.dest!);
        }
      });
    }

    mixer.chunks = [];
    mixer.recorder = new MediaRecorder(mixer.dest.stream, { mimeType: 'audio/webm' });
    mixer.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) mixer.chunks.push(e.data);
    };
    mixer.recorder.start();

    socket.emit('start-recording', { roomId: currentRoom.id });
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
      const client = getAgoraClient();
      const existingTrack = (client as any).__localAudioTrack;

      if (existingTrack) {
        // Close existing track
        try {
          await client.unpublish(existingTrack);
          existingTrack.close();
        } catch { }
        delete (client as any).__localAudioTrack;
      }

      // Check microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: id ? { deviceId: { exact: id } } : true
        });
        stream.getTracks().forEach(track => track.stop());
        console.log('[Agora] Microphone permission granted for device:', id || 'default');
      } catch (permErr) {
        console.error('[Agora] Microphone permission denied:', permErr);
        toast.error('Microphone permission denied. Please allow microphone access.');
        return;
      }

      // Create new track with selected microphone
      const { isMuted } = get();
      const newTrack = await AgoraRTC.createMicrophoneAudioTrack(
        id ? { microphoneId: id } : undefined
      );

      newTrack.setEnabled(!isMuted);
      await client.publish(newTrack);
      (client as any).__localAudioTrack = newTrack;

      console.log('[Agora] Switched to microphone:', id || 'default');
    } catch (err) {
      console.error('[Agora] Failed to switch microphone:', err);
      toast.error('Failed to switch microphone');
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

  joinAgoraChannel: async (userId: number, roomId: string) => {
    const already = get();
    if (already.agoraJoining || already.agoraJoined) return;

    try {
      set({ agoraJoining: true });
      const { isMuted, selectedMicrophoneId } = get();

      const appId = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
      if (!appId || appId === 'YOUR_AGORA_APP_ID') {
        console.warn('[Agora] VITE_AGORA_APP_ID not set — skipping WebRTC join.');
        set({ agoraJoining: false });
        return;
      }

      const client = getAgoraClient();

      if ((client.connectionState as string) !== 'DISCONNECTED') {
        await client.leave();
      }

      const channelName = roomId;
      const uid = userId;

      let token: string | null = null;
      try {
        const res = await fetch(`/api/agora/token?channelName=${encodeURIComponent(channelName)}&uid=${uid}`);
        if (res.ok) {
          const data = await res.json();
          token = data.token ?? null;
          console.log('[Agora] Token fetched, expiresAt:', data.expiresAt ? new Date(data.expiresAt).toISOString() : 'N/A');
        } else {
          console.warn('[Agora] Token fetch failed with status:', res.status);
        }
      } catch (err) {
        console.warn('[Agora] Token fetch threw:', err);
      }

      await client.join(appId, channelName, token || null, uid);
      console.log('[Agora] Joined channel:', channelName, 'uid:', uid);

      // Request microphone permission first
      try {
        console.log('[Agora] Requesting microphone permission...');
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true
        });
        // Stop the tracks immediately - Agora will request its own
        permissionStream.getTracks().forEach(track => track.stop());
        console.log('[Agora] Microphone permission granted');
      } catch (permErr) {
        console.error('[Agora] Microphone permission denied:', permErr);
        toast.error('Microphone permission denied. Please allow microphone access in your browser.');
        await client.leave();
        set({ agoraJoining: false });
        return;
      }

      // Create microphone track
      const audioConfig = selectedMicrophoneId 
        ? { microphoneId: selectedMicrophoneId, AEC: true, ANS: false, AGC: true }
        : { AEC: true, ANS: false, AGC: true };
      
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioConfig);
      localAudioTrack.setEnabled(!isMuted);
      console.log('[Agora] Microphone track created, muted:', isMuted);

      await client.publish(localAudioTrack);
      console.log('[Agora] Published local audio track');

      client.on('user-published', async (remoteUser: any, mediaType: string) => {
        if (mediaType !== 'audio') return;
        await client.subscribe(remoteUser, mediaType);
        remoteUser.audioTrack?.play();
        console.log('[Agora] Remote user published audio:', remoteUser.uid);

        // Mix remote audio if recording is active
        const mixer = (globalThis as any).__lucyMixer as LucyMixer;
        if (mixer?.context && mixer?.dest && remoteUser.audioTrack) {
          try {
            const stream = new MediaStream([remoteUser.audioTrack.getMediaStreamTrack()]);
            const source = mixer.context.createMediaStreamSource(stream);
            source.connect(mixer.dest);
          } catch (err) {
            console.warn('[Agora] Failed to attach remote stream to mixer:', err);
          }
        }
      });

      client.on('connection-state-change', (state: string, prevState: string) => {
        console.log('[Agora] Connection state:', prevState, '→', state);
      });

      (client as any).__localAudioTrack = localAudioTrack;

      const timer = window.setInterval(() => {
        try {
          if (client.connectionState === 'CONNECTED') {
            const stats = client.getRTCStats();
            if (stats && typeof stats.RTT === 'number') {
              set({ latencyMs: stats.RTT });
            }
          }
        } catch { }
      }, 2000);

      set({ agoraReady: true, agoraJoined: true, agoraJoining: false, latencyTimer: timer as any });
    } catch (err: any) {
      if (String(err).includes('OPERATION_ABORTED')) {
        console.log('[Agora] Join operation aborted cleanly.');
        set({ agoraJoining: false });
        return;
      }
      console.error('[Agora] Failed to join channel:', err);
      toast.error('Failed to join audio channel. Please check your connection.');
      set({ agoraJoining: false });
    }
  },

  leaveAgoraChannel: async () => {
    set({ agoraReady: false, agoraJoined: false, agoraJoining: false });
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
