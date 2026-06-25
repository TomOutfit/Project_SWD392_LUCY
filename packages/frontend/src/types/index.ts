// src/types/index.ts
export type UserRole = 'LUCY' | 'PRO' | 'SUPER';
export type Language = 'EN' | 'ZH' | 'JA';

export interface User {
  id: number;
  email: string;
  displayName: string;
  personaId: number;
  role: UserRole;
  walletBalance: number;
}

export interface Level {
  id: number;
  name: string;
  language: Language;
  stage: number;
  subLevel: number;
  content?: LevelContent;
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
  state: string;
  currentSubLevel: number;
  participantCount: number;
  participants?: Participant[];
  pinnedContent?: ContentPin | null;
  createdAt: string;
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

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  personaId: number;
  role: UserRole;
  totalReceived: number;
}

export interface WalletResponse {
  balance: number;
  history: WalletLedgerDto[];
}

export interface WalletLedgerDto {
  id: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

export const PERSONA_GRADIENTS: Record<number, string> = {
  1: 'from-cyan-500 to-blue-600',
  2: 'from-violet-500 to-purple-700',
  3: 'from-magenta-500 to-pink-700',
  4: 'from-amber-500 to-orange-600',
  5: 'from-emerald-500 to-teal-600',
};

export const GIFT_TYPES = [
  { id: 'heart', name: 'Heart', emoji: '❤️', price: 5 },
  { id: 'star', name: 'Star', emoji: '⭐', price: 10 },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', price: 25 },
  { id: 'diamond', name: 'Diamond', emoji: '💎', price: 50 },
  { id: 'crown', name: 'Crown', emoji: '👑', price: 100 },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', price: 500 },
];

export const LANG_FLAGS: Record<Language, string> = {
  EN: '🇬🇧',
  ZH: '🇨🇳',
  JA: '🇯🇵',
};

export const LANG_NAMES: Record<Language, string> = {
  EN: 'English',
  ZH: 'Chinese',
  JA: 'Japanese',
};

export const STAGE_NAMES: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
};
