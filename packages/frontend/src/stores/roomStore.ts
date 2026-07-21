import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import { api, roomsApi, podcastsApi } from '@/lib/api';
import { Room, Participant, ContentPin, LevelContent } from '@/types/index';
import { useAuthStore } from '@/stores/authStore';

// ─── Socket Server Events ─────────────────────────────────────────────────────
interface ServerEvents {
  'room-joined': { room: Room; userId: number };
  'room-left': { roomId: string; oderId: number };
  'room-updated': { room: Room };
  'participant-joined': { roomId: string; participant: Participant };
  'participant-left': { roomId: string; oderId: number };
  'hand-raised': { roomId: string; oderId: number };
  'hand-lowered': { roomId: string; oderId: number };
  'hand-queue-updated': { roomId: string; queue: Participant[] };
  'speak-granted': { roomId: string; oderId: number };
  'speak-revoked': { roomId: string; oderId: number };
  'stage-changed': { roomId: string; newSubLevel: number; levelName: string };
  'gift-received': {
    senderName: string;
    senderPersonaId: number;
    giftType: string;
    amount: number;
    recipientName: string;
    recipientId: number;
    id: string;
  };
  'room-closed': { roomId: string };
  'pinned-content-updated': { roomId: string; pin: ContentPin | null };
  'recording-started': { roomId: string; recordingId: string };
  'recording-stopped': { roomId: string; podcastId: string };
  'ai-recommendation-updated': {
    roomId: string;
    recommendation: LevelContent & { levelName: string; levelId: number };
  };
  'kicked-from-room': { roomId: string };
  'error': { message: string };
}

export interface GiftEvent {
  id: string;
  senderName: string;
  senderPersonaId: number;
  giftType: string;
  amount: number;
  recipientName: string;
  recipientId: number;
}

// ─── State Shape ──────────────────────────────────────────────────────────────
interface RoomState {
  socket: Socket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  agoraClient: IAgoraRTCClient | null;
  localAudioTrack: ILocalAudioTrack | null;
  agoraReady: boolean;
  agoraJoined: boolean;
  agoraJoining: boolean;
  agoraFailed: boolean;

  isMuted: boolean;
  isSpeaking: boolean;
  isSelfMonitoring: boolean;
  selectedMicrophoneId: string | null;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  monitoringGain: GainNode | null;

  currentRoom: Room | null;
  participants: Participant[];
  handQueue: Participant[];
  pinnedContent: ContentPin | null;
  recommendation: (LevelContent & { levelName: string; levelId: number }) | null;
  joiningRoomId: string | null;

  isRecording: boolean;
  recordingTime: number;
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  recordingInterval: ReturnType<typeof setInterval> | null;
  currentPodcastId: string | null;
  isUploading: boolean;

  giftEvents: GiftEvent[];

  latencyMs: number | null;
  pingInterval: ReturnType<typeof setInterval> | null;

  knockStatus: 'none' | 'knocking' | 'approved' | 'denied';
  knockRequests: { socketId: string; user: { id: number; name: string; personaId: number; role: string } }[];
  knockError: string | null;

  speechRecognition: ISpeechRecognition | null;
  detectedLanguage: string | null;
  lastLanguageEmitTime: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────
interface RoomActions {
  connectSocket: (
    userId: number,
    userName: string,
    userPersonaId: number,
    userRole: string,
    roomId?: string,
  ) => void;
  disconnectSocket: () => void;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  closeRoom: () => void;
  handRaise: () => void;
  handLower: () => void;
  toggleHand: () => void;
  toggleMute: () => void;
  grantSpeak: (participantId: number) => void;
  revokeSpeak: (participantId: number) => void;
  forceStageTransition: () => void;
  pinContent: (title: string, url: string, type: ContentPin['type']) => void;
  startRecording: () => void;
  stopRecording: () => void;
  uploadRecording: (podcastId: string, chunks: Blob[]) => Promise<void>;
  joinAgoraChannel: (userId: number, roomId: string) => Promise<void>;
  leaveAgoraChannel: () => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  toggleSelfMonitoring: () => void;
  getLocalVolumeLevel: () => number;
  measureLatency: () => void;
  pingUser: (targetUserId: number) => void;
  kickUser: (participantId: number) => void;
  approveKnock: (roomId: string, targetSocketId: string) => void;
  denyKnock: (roomId: string, targetSocketId: string) => void;
  resetKnock: () => void;
  startLanguageDetection: () => void;
  stopLanguageDetection: () => void;
}

type RoomStore = RoomState & RoomActions;

const initialState: RoomState = {
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,

  agoraClient: null,
  localAudioTrack: null,
  agoraReady: false,
  agoraJoined: false,
  agoraJoining: false,
  agoraFailed: false,

  isMuted: true,
  isSpeaking: false,
  isSelfMonitoring: false,
  selectedMicrophoneId: null,
  audioContext: null,
  analyserNode: null,
  monitoringGain: null,

  currentRoom: null,
  participants: [],
  handQueue: [],
  pinnedContent: null,
  recommendation: null,
  joiningRoomId: null,

  isRecording: false,
  recordingTime: 0,
  mediaRecorder: null,
  recordedChunks: [],
  recordingInterval: null,
  currentPodcastId: null,
  isUploading: false,

  giftEvents: [],

  latencyMs: null,
  pingInterval: null,

  knockStatus: 'none',
  knockRequests: [],
  knockError: null,

  speechRecognition: null,
  detectedLanguage: null,
  lastLanguageEmitTime: 0,
};

// ─── Store ───────────────────────────────────────────────────────────────────
export const useRoomStore = create<RoomStore>((set, get) => ({
  ...initialState,

  connectSocket(userId, userName, userPersonaId, userRole, _roomId?) {
    const existing = get().socket;
    if (existing?.connected) return;

    // In production (Docker): VITE_NJS_URL is unset → connect to same origin
    // nginx proxies /socket.io/ to internal NJS service on port 3001
    const njsUrl = (import.meta.env.VITE_NJS_URL as string | undefined)
      || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = io(njsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      query: { userId: String(userId) },
      auth: { userId, userName, userPersonaId, userRole },
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const on = (ev: string, handler: (...args: any[]) => void) =>
      socket.on(ev, handler);

    on('connect', () => {
      set({ isConnected: true, reconnectAttempts: 0 });
    });

    on('disconnect', () => {
      set({ isConnected: false });
    });

    on('ping-from-user', (data: { fromUserId: number; timestamp: number }) => {
      const s = get().socket;
      if (s) {
        s.emit('pong-user', { targetUserId: data.fromUserId, timestamp: data.timestamp });
      }
    });

    on('pong-from-user', (data: { fromUserId: number; timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      const participant = get().participants.find(p => p.oderId === data.fromUserId);
      const name = participant ? participant.oderName : `User ${data.fromUserId}`;
      
      console.log(`[Telemetry] Latency to ${name}: ${latency}ms`);
      
      // Log peer-to-peer latency in njs-service log
      const njsUrl = (import.meta.env.VITE_NJS_URL as string | undefined) || '';
      fetch(`${njsUrl}/api/latency/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `WS:ping-user:${data.fromUserId}`,
          method: 'WS_PING',
          totalMs: latency,
          serverMs: 0,
          networkMs: latency
        })
      }).catch(() => {});
      
      window.dispatchEvent(new CustomEvent('lucy-user-ping-result', {
        detail: { fromUserId: data.fromUserId, name, latency }
      }));
    });

    on('room-joined', (data: { room: Room }) => {
      const room = data.room;
      set({
        currentRoom: room,
        participants: room.participants ?? [],
        pinnedContent: room.pinnedContent ?? null,
        joiningRoomId: null,
      });
    });

    on('room-left', (data: { oderId: number }) => {
      const { oderId } = data;
      set((s) => ({
        participants: s.participants.filter((p) => p.oderId !== oderId),
        handQueue: s.handQueue.filter((p) => p.oderId !== oderId),
      }));
    });

    on('room-updated', (data: { room: Room }) => {
      set({
        currentRoom: data.room,
        participants: data.room.participants ?? [],
      });
    });

    on('participant-joined', (data: { participant: Participant }) => {
      const { participant } = data;
      set((s) => {
        if (s.participants.find((p) => p.oderId === participant.oderId)) return {};
        return { participants: [...s.participants, participant] };
      });
    });

    on('participant-left', (data: { oderId: number }) => {
      const { oderId } = data;
      set((s) => ({
        participants: s.participants.filter((p) => p.oderId !== oderId),
        handQueue: s.handQueue.filter((p) => p.oderId !== oderId),
      }));
    });

    on('hand-raised', (data: { oderId: number }) => {
      const { oderId } = data;
      set((s) => ({
        participants: s.participants.map((p) =>
          p.oderId === oderId ? { ...p, handRaised: true } : p,
        ),
      }));
    });

    on('hand-lowered', (data: { oderId: number }) => {
      const { oderId } = data;
      set((s) => ({
        participants: s.participants.map((p) =>
          p.oderId === oderId ? { ...p, handRaised: false } : p,
        ),
        handQueue: s.handQueue.filter((p) => p.oderId !== oderId),
      }));
    });

    on('hand-queue-updated', (data: { queue: Participant[] }) => {
      set({ handQueue: data.queue });
    });

    on('speak-granted', (data: { oderId: number }) => {
      const { oderId } = data;
      set((s) => ({
        participants: s.participants.map((p) =>
          p.oderId === oderId
            ? { ...p, isMuted: false, isSpeaking: true, speakGranted: true, handRaised: false }
            : p,
        ),
      }));
    });

    on('speak-revoked', (data: { oderId: number }) => {
      const { oderId } = data;
      set((s) => ({
        participants: s.participants.map((p) =>
          p.oderId === oderId
            ? { ...p, isMuted: true, isSpeaking: false, speakGranted: false }
            : p,
        ),
      }));
    });

    on('stage-changed', (data: { newSubLevel: number; levelName: string }) => {
      set((s) => ({
        currentRoom: s.currentRoom
          ? { ...s.currentRoom, currentSubLevel: data.newSubLevel, levelName: data.levelName, state: 'Active' }
          : null,
      }));
    });

    on('gift-received', (evt: ServerEvents['gift-received']) => {
      set((s) => ({ giftEvents: [...s.giftEvents, evt] }));
      
      // Update balance in authStore if the recipient is the logged-in user
      const { user, updateBalance } = useAuthStore.getState();
      if (user && user.id === evt.recipientId) {
        updateBalance(user.walletBalance + evt.amount);
        // Also update totalGiftsReceived
        useAuthStore.getState().updateUser({
          totalGiftsReceived: (user.totalGiftsReceived || 0) + evt.amount
        });
      }

      setTimeout(() => {
        set((s) => ({ giftEvents: s.giftEvents.filter((e) => e.id !== evt.id) }));
      }, 5000);
    });

    on('room-closed', () => {
      import('react-hot-toast').then(({ toast }) => {
        toast.error('The speaking room has been closed by the host.');
      });
      get().leaveRoom();
      window.dispatchEvent(new CustomEvent('lucy-room-closed'));
    });

    on('kicked-from-room', () => {
      import('react-hot-toast').then(({ toast }) => {
        toast.error('You have been kicked from the room by the host.');
      });
      get().leaveRoom();
      window.dispatchEvent(new CustomEvent('lucy-kicked-from-room'));
    });

    on('xp-earned-batch', (batch: Array<{
      oderId: number;
      oderName: string;
      validatedSpeakingTimeSec: number;
      xpEarned: number;
    }>) => {
      const { user, updateXp } = useAuthStore.getState();
      if (!user) return;

      const myData = batch.find(p => p.oderId === user.id);
      if (!myData) return;

      if (myData.xpEarned > 0) {
        updateXp(myData.xpEarned);
      }

      import('react-hot-toast').then(({ toast }) => {
        const mins = Math.floor(myData.validatedSpeakingTimeSec / 60);
        const secs = myData.validatedSpeakingTimeSec % 60;
        toast.success(
          `Session Complete! 🎉\n` +
          `${myData.oderName} — You spoke for ` +
          `${mins}m ${secs}s\n` +
          `→ +${myData.xpEarned} XP earned!`,
          { duration: 7000 }
        );
      });
    });

    on('pinned-content-updated', (data: { pin: ContentPin | null }) => {
      set({ pinnedContent: data.pin });
    });

    on('recording-started', () => {
      const { currentRoom } = get();
      const currentUser = useAuthStore.getState().user;
      const isHost = currentRoom && currentUser && currentRoom.hostId === currentUser.id;
      if (isHost) {
        get().startRecording();
      } else {
        // Guest: just show the recording UI indicator
        set({ isRecording: true, recordingTime: 0 });
        const interval = setInterval(() => {
          set((s) => ({ recordingTime: s.recordingTime + 1 }));
        }, 1000);
        set({ recordingInterval: interval });
      }
    });

    on('recording-stopped', (_data: any) => {
      const { recordingInterval } = get();

      if (recordingInterval) clearInterval(recordingInterval);

      // Reset UI state immediately, but DO NOT clear currentPodcastId here —
      // the MediaRecorder's final `ondataavailable` fires asynchronously after stop().
      // We need podcastId to still be in state when that event arrives.
      set({
        isRecording: false,
        recordingTime: 0,
        recordingInterval: null,
      });
    });

    on('ai-recommendation-updated', (data: {
      recommendation: LevelContent & { levelName: string; levelId: number };
    }) => {
      set({ recommendation: data.recommendation });
    });

    on('error', (data: { message: string }) => {
      console.error('[roomStore] Socket error:', data.message);
      if (data.message === 'Room not found') {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('The speaking room was not found or has been closed.');
        });
        get().leaveRoom();
        window.dispatchEvent(new CustomEvent('lucy-room-closed'));
      }
    });

    on('knock-waiting', () => {
      set({ knockStatus: 'knocking', knockError: null });
    });

    on('knock-approved', (data: { roomId: string }) => {
      set({ knockStatus: 'approved', knockError: null });
      const user = useAuthStore.getState().user;
      if (user) {
        socket.emit('join-room', {
          roomId: data.roomId,
          user: {
            id: user.id,
            name: user.displayName,
            personaId: user.personaId,
            role: user.role,
          },
        });
      }
    });

    on('knock-denied', () => {
      set({ knockStatus: 'denied', knockError: 'The host has denied your request to join this speaking room.' });
    });

    on('knock-failed', (data: { message: string }) => {
      set({ knockStatus: 'denied', knockError: data.message });
    });

    on('join-request-received', (data: { roomId: string; user: any; socketId: string }) => {
      set(s => {
        if (s.knockRequests.some(r => r.socketId === data.socketId)) return {};
        return { knockRequests: [...s.knockRequests, { socketId: data.socketId, user: data.user }] };
      });
    });

    set({ socket });
    get().measureLatency();
  },

  disconnectSocket() {
    const { socket, pingInterval } = get();
    if (pingInterval) clearInterval(pingInterval);
    socket?.disconnect();
    set({ socket: null, isConnected: false, pingInterval: null });
  },

  // ── Room ─────────────────────────────────────────────────────────────────────

  async joinRoom(roomId) {
    const { socket, isConnected, currentRoom, joiningRoomId } = get();
    if (!socket || !isConnected) return;
    if (currentRoom?.id === roomId || joiningRoomId === roomId) return;

    set({ joiningRoomId: roomId });

    const user = useAuthStore.getState().user;
    if (!user) return;
    (socket as any).emit('knock-room', {
      roomId,
      user: {
        id: user.id,
        name: user.displayName,
        personaId: user.personaId,
        role: user.role,
      },
    });
  },

  approveKnock(roomId, targetSocketId) {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('approve-knock', { roomId, targetSocketId });
      set(s => ({
        knockRequests: s.knockRequests.filter(r => r.socketId !== targetSocketId)
      }));
    }
  },

  denyKnock(roomId, targetSocketId) {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('deny-knock', { roomId, targetSocketId });
      set(s => ({
        knockRequests: s.knockRequests.filter(r => r.socketId !== targetSocketId)
      }));
    }
  },

  resetKnock() {
    set({
      knockStatus: 'none',
      knockError: null,
      joiningRoomId: null,
    });
  },

  // ── Language Detection ─────────────────────────────────────────────────────

  /**
   * Maps room language code to BCP-47 locale for SpeechRecognition.
   * e.g. 'EN' → 'en-US', 'ZH' → 'zh-CN', 'JA' → 'ja-JP'
   */
  startLanguageDetection() {
    const { speechRecognition: existing } = get();
    if (existing) return;

    const { currentRoom, socket } = get();
    if (!currentRoom || !socket) return;

    const langMap: Record<string, string> = {
      EN: 'en-US',
      ZH: 'zh-CN',
      JA: 'ja-JP',
    };
    const lang = langMap[currentRoom.language] ?? 'en-US';

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // eslint-disable-next-line no-console
      console.warn('[roomStore] SpeechRecognition not available in this browser');
      return;
    }

    const recognition = new SR() as ISpeechRecognition;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const { currentRoom: room, socket: sock, lastLanguageEmitTime, detectedLanguage: prevLang } = get();
      if (!room || !sock) return;

      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;

      const transcript = (last[0] as any).transcript?.trim() ?? '';

      // Detect language via character set heuristics as primary method.
      // Web Speech API's lang property is not reliably exposed in TS types.
      const isChinese = /[\u4e00-\u9fff]/.test(transcript);
      const isJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(transcript);
      // eslint-disable-next-line no-console
      const detectedLang = isChinese ? 'zh-CN' : isJapanese ? 'ja-JP' : 'en-US';

      // eslint-disable-next-line no-console
      console.log(`[SpeechRecognition] detected: "${transcript}" → ${detectedLang}`);

      // Debounce: only emit to server if 2 seconds have passed since last emit
      const now = Date.now();
      if (now - lastLanguageEmitTime < 2000 && prevLang === detectedLang) return;

      set({ detectedLanguage: detectedLang, lastLanguageEmitTime: now });
      sock.emit('speaking-language-detected', { roomId: room.id, lang: detectedLang });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // eslint-disable-next-line no-console
      if (event.error !== 'no-speech') console.warn('[roomStore] SpeechRecognition error:', event.error);
    };

    recognition.onend = () => {
      // Restart if room is still active
      const { currentRoom: room, speechRecognition: sr } = get();
      if (room && sr) {
        try { sr.start(); } catch { /* already started */ }
      }
    };

    try {
      recognition.start();
      set({ speechRecognition: recognition });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[roomStore] Could not start SpeechRecognition:', err);
    }
  },

  stopLanguageDetection() {
    const { speechRecognition: sr } = get();
    if (sr) {
      try { sr.stop(); } catch { /* noop */ }
      set({ speechRecognition: null, detectedLanguage: null });
    }
  },

  leaveRoom() {
    const { socket, isConnected, pingInterval, selectedMicrophoneId, currentRoom, agoraJoined, recordingInterval } = get();

    // Stop language detection when leaving room
    get().stopLanguageDetection();

    if (recordingInterval) clearInterval(recordingInterval);

    if (currentRoom?.id && socket?.connected) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit('leave-room', { roomId: currentRoom.id });
    }

    if (agoraJoined) {
      get().leaveAgoraChannel();
    }

    set({
      ...initialState,
      socket,
      isConnected,
      pingInterval,
      selectedMicrophoneId,
      reconnectAttempts: 0,
    });
  },

  closeRoom() {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('close-room', { roomId: currentRoom.id });
    get().leaveRoom();
    window.dispatchEvent(new CustomEvent('lucy-room-closed'));
  },

  // ── Speaking ─────────────────────────────────────────────────────────────────

  handRaise() {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('hand-raise', { roomId: currentRoom.id });
  },

  handLower() {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('hand-lower', { roomId: currentRoom.id });
  },

  toggleHand() {
    const { participants, socket, currentRoom } = get();
    const userId = JSON.parse(localStorage.getItem('lucy_user') || '{}').id;
    const me = participants.find(p => p.oderId === userId);
    if (!socket || !currentRoom) return;

    if (me?.handRaised) {
      (socket as any).emit('hand-lower', { roomId: currentRoom.id });
    } else {
      (socket as any).emit('hand-raise', { roomId: currentRoom.id });
    }
  },

  toggleMute() {
    const { socket, currentRoom, isMuted, localAudioTrack, audioContext } = get();
    // eslint-disable-next-line no-console
    console.log('[toggleMute] called — isMuted:', isMuted, 'audioContext:', audioContext?.state, 'localAudioTrack:', !!localAudioTrack);
    if (!socket || !currentRoom) return;

    const newMuted = !isMuted;

    if (localAudioTrack) {
      localAudioTrack.setEnabled(!newMuted).catch((err) => {
        console.error('[roomStore] Failed to set local audio track enabled:', err);
      });
    }

    // Resume AudioContext so the analyser reads real mic data while unmuted.
    // The browser may have suspended it due to autoplay policy (especially after mute).
    if (!newMuted && audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    set({ isMuted: newMuted, isSpeaking: !newMuted });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('toggle-mute', { roomId: currentRoom.id, muted: newMuted });
  },

  grantSpeak(participantId) {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('grant-speak', { roomId: currentRoom.id, participantId });
  },

  revokeSpeak(participantId) {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('revoke-speak', { roomId: currentRoom.id, participantId });
  },

  kickUser(participantId) {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;

    // Optimistically update local participant cards for instant UI feedback
    set((s) => ({
      participants: s.participants.filter((p) => p.oderId !== participantId),
      handQueue: s.handQueue.filter((p) => p.oderId !== participantId),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('kick-user', { roomId: currentRoom.id, userIdToKick: participantId });
  },

  forceStageTransition() {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('force-stage-transition', { roomId: currentRoom.id });
  },

  // ── Content ──────────────────────────────────────────────────────────────────

  pinContent(title, url, type) {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('pin-content', {
      roomId: currentRoom.id,
      content: { title, url, type, pinnedBy: 0 },
    });
  },

  // ── Recording ────────────────────────────────────────────────────────────────

  async uploadRecording(podcastId: string, chunks: Blob[]) {
    if (!podcastId) {
      console.warn('[roomStore] uploadRecording: missing podcastId');
      return;
    }

    if (chunks.length === 0) {
      console.warn('[roomStore] uploadRecording: no chunks to upload');
      set({ isUploading: false, currentPodcastId: null });
      return;
    }

    set({ isUploading: true, currentPodcastId: podcastId });
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await api.post(`/podcasts/${podcastId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.status === 200) {
        console.log('[roomStore] Recording uploaded, fileUrl:', res.data.fileUrl);

        // Re-fetch the podcast to confirm fileUrl was persisted
        const podcastRes = await podcastsApi.all();
        const updated = podcastRes.data.find((p: any) => p.id === podcastId);
        if (updated && !updated.fileUrl) {
          console.error('[roomStore] fileUrl still empty after upload — check server DB');
        }
      }
    } catch (err) {
      console.error('[roomStore] Failed to upload recording:', err);
    } finally {
      set({ isUploading: false, currentPodcastId: null });
    }
  },

  startRecording() {
    const { isRecording, socket, currentRoom } = get();
    if (isRecording || !socket || !currentRoom) return;

    // Emit to server so other clients know recording is happening
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).emit('start-recording', { roomId: currentRoom.id });

    const audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Capture mic directly via getUserMedia — bypasses Agora's muted state
    // so the recording always contains the user's voice regardless of mute toggle.
    navigator.mediaDevices.getUserMedia({ audio: true }).then((micStream) => {
      const dest = audioContext.createMediaStreamDestination();
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(dest);

      // Also grab remote audio from Agora's audio context if available.
      const { audioContext: agoraCtx, agoraClient } = get();
      if (agoraCtx && agoraClient) {
        agoraClient.remoteUsers.forEach((user) => {
          if (user.hasAudio && user.audioTrack) {
            try {
              const remoteTrack = user.audioTrack.getMediaStreamTrack();
              const remoteSource = agoraCtx.createMediaStreamSource(new MediaStream([remoteTrack]));
              remoteSource.connect(dest);
            } catch (err) {
              console.warn('[roomStore] Could not add remote user to recording stream:', err);
            }
          }
        });
      }

      const stream = dest.stream;
      const chunks: Blob[] = [];
      let options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'audio/ogg;codecs=opus' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: '' };
          }
        }
      }

      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
        // MediaRecorder fires one final ondataavailable after stop() with the remaining buffer.
        // Wait until recorder is inactive to ensure we have ALL chunks before uploading.
        if (recorder.state === 'inactive' && chunks.length > 0) {
          const finalChunks = [...chunks];
          chunks.length = 0;
          const { currentPodcastId: pid } = get();
          if (pid) get().uploadRecording(pid, finalChunks);
        }
      };

      recorder.onstop = () => {
        audioContext.close();
        micStream.getTracks().forEach((t) => t.stop());
        set({ recordedChunks: [] });
      };

      recorder.start(1000);
      const interval = setInterval(() => {
        set((s) => ({ recordingTime: s.recordingTime + 1 }));
      }, 1000);

      set({
        isRecording: true,
        recordingTime: 0,
        mediaRecorder: recorder,
        recordedChunks: chunks,
        recordingInterval: interval,
      });
    }).catch((err) => {
      console.error('[roomStore] Failed to get microphone for recording:', err);
    });
  },

  stopRecording() {
    const { isRecording, mediaRecorder, recordingInterval, socket, currentRoom } = get();
    if (!isRecording || !mediaRecorder || mediaRecorder.state === 'inactive') return;

    if (recordingInterval) clearInterval(recordingInterval);

    // Store socket/room before clearing state
    const roomId = currentRoom?.id ?? null;
    const socketRef = socket;

    set({
      isRecording: false,
      recordingTime: 0,
      mediaRecorder: null,
      recordingInterval: null,
    });

    // Stop the recorder — fires ondataavailable (final chunk) then onstop.
    // Upload is triggered by ondataavailable when recorder becomes inactive.
    // We emit stop-recording AFTER stop() so the server durationSec matches
    // the actual recording window, not a moment before the recorder fully stops.
    mediaRecorder.stop();

    // Emit to server only after stop() so durationSec is accurate.
    // (The upload will follow asynchronously via ondataavailable → uploadRecording.)
    if (socketRef && roomId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socketRef as any).emit('stop-recording', { roomId });
    }
  },

  // ── Agora ────────────────────────────────────────────────────────────────────

  async joinAgoraChannel(userId, roomId) {
    const { agoraJoined, agoraJoining, agoraFailed, agoraClient } = get();
    if (agoraJoined || agoraJoining || agoraFailed) return;

    if (agoraClient) {
      if (agoraClient.connectionState === 'CONNECTED' || agoraClient.connectionState === 'CONNECTING') {
        console.log('[roomStore] Agora client is already connected or connecting. Aborting.');
        return;
      }
      try {
        if (agoraClient.connectionState !== 'DISCONNECTED') {
          await agoraClient.leave();
        }
      } catch {}
    }

    set({ agoraJoining: true });

    try {
      const res = await roomsApi.agoraToken(roomId, userId);
      const { token, channelName, uid } = res.data;

      const client = agoraClient || AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      const { selectedMicrophoneId: micId, isMuted: currentlyMuted } = get();

      // Get raw mic stream FIRST — this feeds the analyser with real PCM data.
      // Agora's internal capture doesn't expose raw audio to Web Audio API.
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: micId ? { deviceId: { exact: micId } } : true,
      });
      const rawTrack = rawStream.getAudioTracks()[0];

      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(rawStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const gainNode = audioContext.createGain();
      gainNode.gain.value = get().isSelfMonitoring ? 1 : 0;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Agora gets the SAME raw track — it handles its own encoding/network separately.
      // We pass the raw track directly instead of letting Agora create its own capture.
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: micId || undefined,
        encoderConfig: 'speech_standard',
        AGC: true,
        // @ts-expect-error – raw track injection supported at runtime
        audioTrack: rawTrack,
      });

      client.on('user-published', async (user, mediaType) => {
        if (mediaType === 'audio') {
          await client.subscribe(user, 'audio');
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          client.unsubscribe(user, 'audio');
        }
      });

      const agoraAppId = (import.meta.env.VITE_AGORA_APP_ID as string | undefined) || '';
      console.log('[roomStore] Agora join — AppID:', agoraAppId, 'channel:', channelName, 'uid:', uid, 'token:', token ? 'present' : 'missing');
      if (!agoraAppId) {
        console.error('[roomStore] Agora App ID is missing. Check your .env VITE_AGORA_APP_ID.');
        set({ agoraJoining: false, agoraJoined: false, agoraFailed: true });
        return;
      }
      await client.join(agoraAppId, channelName, token, uid);
      await client.publish(audioTrack);

      // Track đã publish thành công khi đang enabled (mặc định).
      // Giờ đồng bộ với trạng thái isMuted hiện tại của UI.
      if (currentlyMuted) {
        await audioTrack.setEnabled(false);
      }

      set({
        agoraClient: client,
        localAudioTrack: audioTrack,
        audioContext,
        analyserNode: analyser,
        monitoringGain: gainNode,
        selectedMicrophoneId: micId,
        agoraReady: true,
        agoraJoined: true,
        agoraJoining: false,
      });

      // Start language detection so speaking time is only counted
      // when the user speaks in the room's target language
      get().startLanguageDetection();

      // eslint-disable-next-line no-console
      console.log('[joinAgoraChannel] analyserNode set:', analyser, 'fftSize:', analyser.fftSize);
    } catch (err) {
      console.error('[roomStore] Agora join failed:', err);
      set({ agoraJoining: false, agoraJoined: false, agoraFailed: true });
    }
  },

  async leaveAgoraChannel() {
    const { agoraClient, localAudioTrack, audioContext } = get();

    if (agoraClient) {
      if (localAudioTrack) {
        await agoraClient.unpublish(localAudioTrack);
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      await agoraClient.leave();
    }

    if (audioContext) {
      audioContext.close();
    }

    set({
      agoraClient: null,
      localAudioTrack: null,
      agoraReady: false,
      agoraJoined: false,
      agoraJoining: false,
      agoraFailed: false,
      audioContext: null,
      analyserNode: null,
      monitoringGain: null,
    });
  },

  // ── Microphone ───────────────────────────────────────────────────────────────

  async switchMicrophone(deviceId) {
    const { agoraClient, localAudioTrack, analyserNode, audioContext, isSelfMonitoring, agoraJoined } = get();
    if (!audioContext || !analyserNode) return;

    try {
      const newTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: deviceId,
        encoderConfig: 'speech_standard',
        AGC: true,
      });

      const mediaStreamTrack = newTrack.getMediaStreamTrack();
      const source = audioContext.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
      const gainNode = audioContext.createGain();
      gainNode.gain.value = isSelfMonitoring ? 1 : 0;
      source.connect(analyserNode);
      analyserNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (agoraClient && localAudioTrack && agoraJoined) {
        await agoraClient.unpublish(localAudioTrack);
        localAudioTrack.stop();
        localAudioTrack.close();
        await agoraClient.publish(newTrack);
      }

      set({ localAudioTrack: newTrack, selectedMicrophoneId: deviceId, monitoringGain: gainNode });
    } catch (err) {
      console.error('[roomStore] Failed to switch microphone:', err);
    }
  },

  toggleSelfMonitoring() {
    const { isSelfMonitoring, monitoringGain, isMuted } = get();
    if (isMuted) return;

    const newValue = !isSelfMonitoring;
    if (monitoringGain) {
      monitoringGain.gain.value = newValue ? 1 : 0;
    }
    set({ isSelfMonitoring: newValue });
  },

  getLocalVolumeLevel() {
    const { analyserNode } = get();
    if (!analyserNode) return 0;

    const freqArr = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqArr);
    const freqAvg = freqArr.reduce((a, b) => a + b, 0) / freqArr.length;

    const timeArr = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteTimeDomainData(timeArr);
    let sum = 0;
    let max = 0;
    for (let i = 0; i < timeArr.length; i++) {
      const val = (timeArr[i] - 128) / 128;
      sum += val * val;
      const dev = Math.abs(timeArr[i] - 128);
      if (dev > max) max = dev;
    }
    const rms = Math.sqrt(sum / timeArr.length);
    const result = Math.min(100, rms * 500);

    // eslint-disable-next-line no-console
    console.log('[getLocalVolumeLevel] freqAvg:', freqAvg.toFixed(1), '| timeRMS:', rms.toFixed(4), 'maxDev:', max, '→', result.toFixed(1));

    return result;
  },

  // ── Latency ─────────────────────────────────────────────────────────────────

  measureLatency() {
    const { socket, pingInterval } = get();
    if (!socket) return;

    if (pingInterval) clearInterval(pingInterval);

    const interval = setInterval(() => {
      const sentAt = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit('ping', (res: { ok: boolean; t: number }) => {
        if (res?.ok) {
          const latency = Date.now() - sentAt;
          set({ latencyMs: latency });
          (socket as any).emit('log-websocket-latency', { latencyMs: latency });
        }
      });
    }, 5000);

    set({ pingInterval: interval });
  },

  pingUser(targetUserId) {
    const { socket } = get();
    if (!socket) return;
    socket.emit('ping-user', { targetUserId, timestamp: Date.now() });
  },
}));