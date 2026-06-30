// src/types/index.ts
export enum UserRole { LUCY = 0, PRO = 1, SUPER = 2 }
export enum Language { EN = 'EN', ZH = 'ZH', JA = 'JA' }
export enum RoomState { LOBBY = 'Lobby', ACTIVE = 'Active', SUBLEVEL_TRANSITION = 'Transition', CLOSED = 'Closed' }

export interface Level {
  id: number;
  name: string;
  language: Language;
  stage: number; // 1=Sơ cấp, 2=Trung cấp, 3=Cao cấp
  subLevel: number; // 1-12 (each 10 minutes = 120 min total)
  content: LevelContent;
}

export interface LevelContent {
  vocabulary: string[];
  conversationPrompts: string[];
  grammarTips: string[];
  aiSuggestedQuestions: string[];
}

export interface Room {
  id: string;
  name: string;
  hostId: number;
  hostName: string;
  hostPersonaId: number;
  hostRole: string;
  language: Language;
  levelId: number;
  levelName: string;
  isLive: boolean;
  state: RoomState;
  currentSubLevel: number;
  participants: Participant[];
  pinnedContent: ContentPin | null;
  createdAt?: string;
  nextTransitionAt?: string;
  participantCount: number;
}

export interface Participant {
  oderId: number;
  oderName: string;
  oderPersonaId: number;
  oderRole: string;
  joinedAt: string;
  isMuted: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  handRaisedAt?: string;
  speakingDurationSec?: number;
  speakGranted?: boolean;
}

export interface ContentPin {
  id: string;
  title: string;
  url: string;
  type: 'vocabulary' | 'grammar' | 'conversation' | 'pdf';
  pinnedBy: number;
  pinnedAt: string;
}

export interface Podcast {
  id: string;
  roomId: string;
  roomName: string;
  creatorId: number;
  creatorName: string;
  title: string;
  durationSec: number;
  fileUrl: string;
  language: Language;
  levelName: string;
  createdAt: string;
  listenCount: number;
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  expiresAt: number;
}

// Socket.io Events (Client → Server)
export interface ClientEvents {
  'join-room': { roomId: string; user: { id: number; name: string; personaId: number; role: string } };
  'leave-room': { roomId: string };
  'hand-raise': { roomId: string };
  'hand-lower': { roomId: string };
  'toggle-mute': { roomId: string; muted: boolean };
  'grant-speak': { roomId: string; participantId: number };
  'revoke-speak': { roomId: string; participantId: number };
  'create-room': Omit<Room, 'id' | 'participants' | 'pinnedContent' | 'createdAt' | 'participantCount'>;
  'close-room': { roomId: string };
  'pin-content': { roomId: string; content: Omit<ContentPin, 'id' | 'pinnedAt'> };
  'start-recording': { roomId: string };
  'stop-recording': { roomId: string };
}

// Socket.io Events (Server → Client)
export interface ServerEvents {
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
  'gift-received': { senderName: string; senderPersonaId: number; giftType: string; amount: number; recipientName: string };
  'room-closed': { roomId: string };
  'pinned-content-updated': { roomId: string; pin: ContentPin | null };
  'recording-started': { roomId: string; recordingId: string };
  'recording-stopped': { roomId: string; podcastId: string };
  'error': { message: string };
}
