// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/lucy.db');

import fs from 'fs';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// ── Migration helpers ─────────────────────────────────────────────────────────
function tableExists(tableName: string): boolean {
  const row = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName) as { name: string } | undefined;
  return !!row;
}

function columnExists(tableName: string, colName: string): boolean {
  try {
    const info = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    return info.some(c => c.name === colName);
  } catch {
    return false;
  }
}

function addColumnIfMissing(table: string, col: string, type: string): void {
  if (!columnExists(table, col)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    console.log(`[DB] Added column ${col} to ${table}`);
  }
}

// ── Schema setup ──────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    stage INTEGER NOT NULL,
    sub_level INTEGER NOT NULL,
    content_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_id INTEGER NOT NULL,
    host_name TEXT NOT NULL,
    host_persona_id INTEGER NOT NULL,
    host_role TEXT NOT NULL,
    language TEXT NOT NULL,
    level_id INTEGER NOT NULL,
    level_name TEXT NOT NULL,
    is_live INTEGER NOT NULL DEFAULT 1,
    state TEXT NOT NULL DEFAULT 'Lobby',
    current_sub_level INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    participant_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS podcasts (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    creator_id INTEGER NOT NULL,
    creator_name TEXT NOT NULL,
    title TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    language TEXT NOT NULL,
    level_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    listen_count INTEGER NOT NULL DEFAULT 0
  );
`);

// Ensure study_sessions table exists (handles both fresh DB and existing DB without the table)
if (!tableExists('study_sessions')) {
  sqlite.exec(`
    CREATE TABLE study_sessions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      host_id INTEGER NOT NULL,
      host_name TEXT NOT NULL,
      language TEXT NOT NULL,
      level_name TEXT NOT NULL,
      participants_json TEXT NOT NULL,
      total_duration_sec INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      closed_at TEXT NOT NULL
    );
  `);
  console.log('[DB] Created study_sessions table');
}

// Seed 100 levels
const { count } = sqlite.prepare('SELECT COUNT(*) as count FROM levels').get() as { count: number };
if (count === 0) {
  const insert = sqlite.prepare('INSERT INTO levels (id, name, language, stage, sub_level, content_json) VALUES (?, ?, ?, ?, ?, ?)');
  const stageNames = ['Beginner', 'Intermediate', 'Advanced'];
  const langNames = { EN: 'English', ZH: 'Chinese', JA: 'Japanese' };

  for (let id = 1; id <= 100; id++) {
    const stage = id <= 34 ? 1 : id <= 67 ? 2 : 3;
    const subLevel = ((id - 1) % 12) + 1;
    const lang = ['EN', 'ZH', 'JA'][Math.floor((id - 1) / 34)];
    const content = {
      vocabulary: [`word-${id}-a`, `word-${id}-b`, `word-${id}-c`, `word-${id}-d`, `phrase-${id}`],
      conversationPrompts: [
        `Practice introducing yourself at ${langNames[lang as keyof typeof langNames]} level ${id}`,
        `Role-play ordering food in ${langNames[lang as keyof typeof langNames]} language`,
        `Discuss your daily routine using level ${id} vocabulary`,
      ],
      grammarTips: [
        `Grammar point for level ${id}: ${stageNames[stage - 1]} structures`,
        `Common pattern in ${langNames[lang as keyof typeof langNames]} level ${id}`,
      ],
      aiSuggestedQuestions: [
        `What did you do last weekend? (Level ${id} vocabulary)`,
        `Can you describe your hometown?`,
        `How would you ask for directions in ${langNames[lang as keyof typeof langNames]}?`,
      ],
    };

    insert.run(id, `Level ${id} - ${stageNames[stage - 1]} ${langNames[lang as keyof typeof langNames]}`, lang, stage, subLevel, JSON.stringify(content));
  }
  console.log('Seeded 100 levels into database.');
}

// Ensure cover_url column exists on podcasts table
addColumnIfMissing('podcasts', 'cover_url', 'TEXT');

// Seed sample podcasts if table has fewer than 50 podcasts
const { count: pCount } = sqlite.prepare('SELECT COUNT(*) as count FROM podcasts').get() as { count: number };
if (pCount < 50) {
  sqlite.prepare("DELETE FROM podcasts WHERE id LIKE 'sample-%' OR id LIKE 'podcast-%'").run();
  const insertPod = sqlite.prepare(`
    INSERT INTO podcasts (id, room_id, room_name, creator_id, creator_name, title, duration_sec, file_url, cover_url, language, level_name, created_at, listen_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedData = [
    // ── English Podcasts (15 Shows) ──
    {
      id: 'podcast-en-1',
      roomId: 'room-en-101',
      roomName: 'Business English Intensive',
      creatorId: 1,
      creatorName: 'Sarah Jenkins (Super Host)',
      title: 'Mastering Business English: Professional Email Etiquette & Meetings',
      durationSec: 245,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 18 - Intermediate English',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      listenCount: 1420
    },
    {
      id: 'podcast-en-2',
      roomId: 'room-en-104',
      roomName: 'American Accent Masterclass',
      creatorId: 4,
      creatorName: 'Emma Watson-Smith',
      title: 'Connected Speech & Linking Sounds in American English',
      durationSec: 412,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 24 - Upper Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 980
    },
    {
      id: 'podcast-en-3',
      roomId: 'room-en-107',
      roomName: 'IELTS Band 8 Prep',
      creatorId: 7,
      creatorName: 'David Miller (Ex-Examiner)',
      title: 'IELTS Speaking Part 2: Structuring High-Score Answers',
      durationSec: 530,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 30 - Advanced English',
      createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
      listenCount: 2350
    },
    {
      id: 'podcast-en-4',
      roomId: 'room-en-108',
      roomName: 'Tech & AI Discussions',
      creatorId: 8,
      creatorName: 'Alex Thorne',
      title: 'Talking Tech: Discussing Artificial Intelligence & Software Architecture in English',
      durationSec: 365,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 28 - Advanced Tech English',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 1740
    },
    {
      id: 'podcast-en-5',
      roomId: 'room-en-109',
      roomName: 'Everyday Idioms & Slang',
      creatorId: 9,
      creatorName: 'Chloe Bennett',
      title: 'Top 50 English Idioms Native Speakers Use Every Single Day',
      durationSec: 280,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 14 - Pre-Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 180).toISOString(),
      listenCount: 3100
    },
    {
      id: 'podcast-en-6',
      roomId: 'room-en-110',
      roomName: 'Job Interview Masterclass',
      creatorId: 1,
      creatorName: 'Sarah Jenkins (Super Host)',
      title: 'Ace Your Tech Job Interview: Answering Tell Me About Yourself',
      durationSec: 390,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 22 - Business English',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 4210
    },
    {
      id: 'podcast-en-7',
      roomId: 'room-en-111',
      roomName: 'BBC News Vocabulary',
      creatorId: 7,
      creatorName: 'David Miller (Ex-Examiner)',
      title: 'Decoding Global Headliner News: Advanced Political & Economic Terms',
      durationSec: 480,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 32 - Advanced C1',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 1890
    },
    {
      id: 'podcast-en-8',
      roomId: 'room-en-112',
      roomName: 'Silicon Valley English',
      creatorId: 8,
      creatorName: 'Alex Thorne',
      title: 'Startup Pitching & Product Strategy Vocabulary for Developers',
      durationSec: 330,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 26 - Tech & Product',
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
      listenCount: 2780
    },
    {
      id: 'podcast-en-9',
      roomId: 'room-en-113',
      roomName: 'English Literature & Storytelling',
      creatorId: 4,
      creatorName: 'Emma Watson-Smith',
      title: 'The Art of Narrative: Storytelling Techniques for Public Speaking',
      durationSec: 510,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 34 - Advanced Humanities',
      createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
      listenCount: 1350
    },
    {
      id: 'podcast-en-10',
      roomId: 'room-en-114',
      roomName: 'Phrasal Verbs Demystified',
      creatorId: 9,
      creatorName: 'Chloe Bennett',
      title: '100 Essential Phrasal Verbs You Need for Conversational Fluency',
      durationSec: 295,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 16 - Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 80).toISOString(),
      listenCount: 3890
    },
    {
      id: 'podcast-en-11',
      roomId: 'room-en-115',
      roomName: 'Public Speaking Confidence',
      creatorId: 1,
      creatorName: 'Sarah Jenkins (Super Host)',
      title: 'Overcoming Stage Fright & Delivering Impactful Presentations',
      durationSec: 420,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 25 - Executive English',
      createdAt: new Date(Date.now() - 3600000 * 100).toISOString(),
      listenCount: 2650
    },
    {
      id: 'podcast-en-12',
      roomId: 'room-en-116',
      roomName: 'Medical & Healthcare English',
      creatorId: 7,
      creatorName: 'David Miller (Ex-Examiner)',
      title: 'Doctor-Patient Communication & Medical Terminology',
      durationSec: 360,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 29 - Specialized Professional',
      createdAt: new Date(Date.now() - 3600000 * 110).toISOString(),
      listenCount: 1140
    },
    {
      id: 'podcast-en-13',
      roomId: 'room-en-117',
      roomName: 'Fintech & Investment Talk',
      creatorId: 8,
      creatorName: 'Alex Thorne',
      title: 'Cryptocurrency, Blockchain & Global Banking Terms Explained',
      durationSec: 440,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 31 - Finance English',
      createdAt: new Date(Date.now() - 3600000 * 130).toISOString(),
      listenCount: 2010
    },
    {
      id: 'podcast-en-14',
      roomId: 'room-en-118',
      roomName: 'Travel & Global Cultures',
      creatorId: 9,
      creatorName: 'Chloe Bennett',
      title: 'Navigating Airports, Hotels & Street Markets Like a Local',
      durationSec: 260,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 12 - Beginner Travel',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 3500
    },
    {
      id: 'podcast-en-15',
      roomId: 'room-en-119',
      roomName: 'Academic Essay Writing',
      creatorId: 4,
      creatorName: 'Emma Watson-Smith',
      title: 'Structuring Academic Arguments & Thesis Statements for Universities',
      durationSec: 490,
      fileUrl: '/uploads/podcasts/podcast-en-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 33 - Academic C1',
      createdAt: new Date(Date.now() - 3600000 * 160).toISOString(),
      listenCount: 1620
    },

    // ── Japanese Podcasts (10 Shows) ──
    {
      id: 'podcast-ja-1',
      roomId: 'room-ja-202',
      roomName: 'Tokyo Speaking Lounge',
      creatorId: 2,
      creatorName: 'Kenji Sato (Super Host)',
      title: '日常会話と敬語 (Daily Japanese & Politeness Levels in Tokyo)',
      durationSec: 310,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 42 - Intermediate Japanese',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 1890
    },
    {
      id: 'podcast-ja-2',
      roomId: 'room-ja-205',
      roomName: 'Anime & Pop Culture Cafe',
      creatorId: 5,
      creatorName: 'Yumi Tanaka',
      title: 'アニメで学ぶ日本語表現 (Anime Expressions & Casual Japanese Slang)',
      durationSec: 275,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 38 - Beginner Japanese',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      listenCount: 2640
    },
    {
      id: 'podcast-ja-3',
      roomId: 'room-ja-208',
      roomName: 'JLPT N3 Cram Session',
      creatorId: 2,
      creatorName: 'Kenji Sato (Super Host)',
      title: 'JLPT N3 文法徹底解説 (JLPT N3 Sentence Patterns & Key Exercises)',
      durationSec: 340,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1528164344705-47542687990d?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 50 - JLPT N3 Level',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 1410
    },
    {
      id: 'podcast-ja-4',
      roomId: 'room-ja-209',
      roomName: 'Kyoto Travel & Culture',
      creatorId: 10,
      creatorName: 'Haruto Takahashi',
      title: '京都の歴史と伝統文化を楽しむ日本語 (Enjoying Kyoto History & Cultural Nuances)',
      durationSec: 390,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 48 - Advanced Japanese',
      createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
      listenCount: 1120
    },
    {
      id: 'podcast-ja-5',
      roomId: 'room-ja-210',
      roomName: 'Business Keigo Workshop',
      creatorId: 2,
      creatorName: 'Kenji Sato (Super Host)',
      title: 'ビジネスメールと電話対応の敬語 (Business Mail & Phone Keigo Etiquette)',
      durationSec: 410,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 58 - Business Keigo',
      createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
      listenCount: 3100
    },
    {
      id: 'podcast-ja-6',
      roomId: 'room-ja-211',
      roomName: 'Izakaya & Food Culture',
      creatorId: 5,
      creatorName: 'Yumi Tanaka',
      title: '居酒屋で使えるリアル日本語 (Real Japanese Used in Tokyo Izakayas)',
      durationSec: 250,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1554797589-7241ab691973?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 40 - Practical Japanese',
      createdAt: new Date(Date.now() - 3600000 * 45).toISOString(),
      listenCount: 2890
    },
    {
      id: 'podcast-ja-7',
      roomId: 'room-ja-212',
      roomName: 'Kansai Dialect (Kansai-ben)',
      creatorId: 10,
      creatorName: 'Haruto Takahashi',
      title: '大阪弁・関西弁入門 (Introduction to Osaka & Kansai Dialect Nuances)',
      durationSec: 330,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 52 - Dialect Mastery',
      createdAt: new Date(Date.now() - 3600000 * 85).toISOString(),
      listenCount: 1980
    },
    {
      id: 'podcast-ja-8',
      roomId: 'room-ja-213',
      roomName: 'JLPT N2 Listening Intensive',
      creatorId: 2,
      creatorName: 'Kenji Sato (Super Host)',
      title: 'JLPT N2 聴解対策：ニュースと対話 (N2 Listening: News & Conversations)',
      durationSec: 460,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 62 - JLPT N2 Level',
      createdAt: new Date(Date.now() - 3600000 * 115).toISOString(),
      listenCount: 1750
    },
    {
      id: 'podcast-ja-9',
      roomId: 'room-ja-214',
      roomName: 'Manga Dialogue Analysis',
      creatorId: 5,
      creatorName: 'Yumi Tanaka',
      title: '漫画のセリフで覚える感情表現 (Learning Emotional Expressions in Manga)',
      durationSec: 280,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 44 - Manga Japanese',
      createdAt: new Date(Date.now() - 3600000 * 145).toISOString(),
      listenCount: 3240
    },
    {
      id: 'podcast-ja-10',
      roomId: 'room-ja-215',
      roomName: 'Japanese Folklore & Tales',
      creatorId: 10,
      creatorName: 'Haruto Takahashi',
      title: '日本の昔話と妖怪伝説 (Traditional Japanese Folklore & Yokai Tales)',
      durationSec: 380,
      fileUrl: '/uploads/podcasts/podcast-ja-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 55 - Culture & Myth',
      createdAt: new Date(Date.now() - 3600000 * 175).toISOString(),
      listenCount: 1430
    },

    // ── Chinese / Mandarin Podcasts (10 Shows) ──
    {
      id: 'podcast-zh-1',
      roomId: 'room-zh-303',
      roomName: 'Mandarin Fluency Hub',
      creatorId: 3,
      creatorName: 'Wei Zhang (Super Host)',
      title: 'HSK 4 核心词汇与商务谈判 (HSK 4 Core Vocab & Negotiation Phrases)',
      durationSec: 198,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 55 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 1512
    },
    {
      id: 'podcast-zh-2',
      roomId: 'room-zh-306',
      roomName: 'Shanghai Street Chinese',
      creatorId: 6,
      creatorName: 'Li Na',
      title: '在中国餐馆点餐与街头美食 (Ordering Food & Street Eats in Shanghai)',
      durationSec: 220,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1543083477-4f785aeafaa9?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 15 - Elementary Chinese',
      createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      listenCount: 2380
    },
    {
      id: 'podcast-zh-3',
      roomId: 'room-zh-307',
      roomName: 'Pinyin & Tones Workshop',
      creatorId: 11,
      creatorName: 'Chen Xi',
      title: '汉语拼音与四声发音秘诀 (Mastering Mandarin Pinyin & Tone Accuracy)',
      durationSec: 295,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 10 - Beginner Pinyin',
      createdAt: new Date(Date.now() - 3600000 * 210).toISOString(),
      listenCount: 1840
    },
    {
      id: 'podcast-zh-4',
      roomId: 'room-zh-308',
      roomName: 'Chinese Drama Slang',
      creatorId: 6,
      creatorName: 'Li Na',
      title: '看陆剧学网络流行语 (Learn Chinese Internet Slang from Popular Dramas)',
      durationSec: 270,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 42 - Intermediate Slang',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      listenCount: 3120
    },
    {
      id: 'podcast-zh-5',
      roomId: 'room-zh-309',
      roomName: 'Shenzhen E-Commerce Talk',
      creatorId: 3,
      creatorName: 'Wei Zhang (Super Host)',
      title: '深圳科技与跨境电商常用词汇 (Tech & E-Commerce Vocab in Shenzhen)',
      durationSec: 360,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 58 - Tech Mandarin',
      createdAt: new Date(Date.now() - 3600000 * 54).toISOString(),
      listenCount: 2090
    },
    {
      id: 'podcast-zh-6',
      roomId: 'room-zh-310',
      roomName: 'Chengyu & Idioms Secrets',
      creatorId: 11,
      creatorName: 'Chen Xi',
      title: '常用成语故事与日常运用 (Famous Chinese Chengyu Idiom Stories & Usage)',
      durationSec: 320,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 48 - Intermediate Chengyu',
      createdAt: new Date(Date.now() - 3600000 * 88).toISOString(),
      listenCount: 1670
    },
    {
      id: 'podcast-zh-7',
      roomId: 'room-zh-311',
      roomName: 'HSK 5 Exam Breakthrough',
      creatorId: 3,
      creatorName: 'Wei Zhang (Super Host)',
      title: 'HSK 5 听力与阅读高分技巧 (HSK 5 Listening & Reading Strategy)',
      durationSec: 450,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 65 - HSK 5 Mastery',
      createdAt: new Date(Date.now() - 3600000 * 132).toISOString(),
      listenCount: 1940
    },
    {
      id: 'podcast-zh-8',
      roomId: 'room-zh-312',
      roomName: 'Beijing Cultural Walk',
      creatorId: 6,
      creatorName: 'Li Na',
      title: '北京胡同文化与老北京话 (Beijing Hutong Culture & Local Dialects)',
      durationSec: 310,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 50 - Beijing Culture',
      createdAt: new Date(Date.now() - 3600000 * 165).toISOString(),
      listenCount: 1420
    },
    {
      id: 'podcast-zh-9',
      roomId: 'room-zh-313',
      roomName: 'Tea Ceremony & Etiquette',
      creatorId: 11,
      creatorName: 'Chen Xi',
      title: '中国茶道文化与品茶用语 (Chinese Tea Ceremony Culture & Vocabulary)',
      durationSec: 340,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 45 - Traditional Culture',
      createdAt: new Date(Date.now() - 3600000 * 195).toISOString(),
      listenCount: 1190
    },
    {
      id: 'podcast-zh-10',
      roomId: 'room-zh-314',
      roomName: 'Chinese Festive Customs',
      creatorId: 3,
      creatorName: 'Wei Zhang (Super Host)',
      title: '春节与中秋节传统习俗表达 (Spring Festival & Mid-Autumn Expressions)',
      durationSec: 290,
      fileUrl: '/uploads/podcasts/podcast-zh-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1543083477-4f785aeafaa9?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 38 - Holiday Customs',
      createdAt: new Date(Date.now() - 3600000 * 230).toISOString(),
      listenCount: 2850
    },

    // ── Spanish Podcasts (6 Shows) ──
    {
      id: 'podcast-es-1',
      roomId: 'room-es-401',
      roomName: 'Café de Madrid',
      creatorId: 12,
      creatorName: 'Carlos Rossi (Super Host)',
      title: 'Hablar Español con Fluidez: Conversaciones Cotidianas en Madrid',
      durationSec: 320,
      fileUrl: '/uploads/podcasts/podcast-es-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1513740051206-8d63a48e6522?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 22 - Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      listenCount: 1950
    },
    {
      id: 'podcast-es-2',
      roomId: 'room-es-402',
      roomName: 'Latinoamérica Real',
      creatorId: 13,
      creatorName: 'Isabella Gómez',
      title: 'Modismos y Expresiones Populares en México y Colombia',
      durationSec: 260,
      fileUrl: '/uploads/podcasts/podcast-es-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 35 - Upper Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 1270
    },
    {
      id: 'podcast-es-3',
      roomId: 'room-es-403',
      roomName: 'DELE B2 Prep Lounge',
      creatorId: 12,
      creatorName: 'Carlos Rossi (Super Host)',
      title: 'Estrategias para la Prueba Oral del DELE B2',
      durationSec: 400,
      fileUrl: '/uploads/podcasts/podcast-es-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 45 - DELE B2 Level',
      createdAt: new Date(Date.now() - 3600000 * 70).toISOString(),
      listenCount: 1840
    },
    {
      id: 'podcast-es-4',
      roomId: 'room-es-404',
      roomName: 'Tapas & Spanish Gastronomy',
      creatorId: 13,
      creatorName: 'Isabella Gómez',
      title: 'Gastronomía Española: De Tapas por Barcelona y Sevilla',
      durationSec: 280,
      fileUrl: '/uploads/podcasts/podcast-es-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1515443961218-a5136d888be7?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 28 - Spanish Culture',
      createdAt: new Date(Date.now() - 3600000 * 110).toISOString(),
      listenCount: 2410
    },
    {
      id: 'podcast-es-5',
      roomId: 'room-es-405',
      roomName: 'Flamenco & Andalusian History',
      creatorId: 12,
      creatorName: 'Carlos Rossi (Super Host)',
      title: 'El Arte del Flamenco y la Historia de Andalucía',
      durationSec: 370,
      fileUrl: '/uploads/podcasts/podcast-es-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 42 - Advanced Spanish',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 1560
    },
    {
      id: 'podcast-es-6',
      roomId: 'room-es-406',
      roomName: 'Cine y Literatura Hispana',
      creatorId: 13,
      creatorName: 'Isabella Gómez',
      title: 'Grandes Obras de la Literatura y Cine de América Latina',
      durationSec: 430,
      fileUrl: '/uploads/podcasts/podcast-es-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 50 - Hispanic Arts',
      createdAt: new Date(Date.now() - 3600000 * 180).toISOString(),
      listenCount: 1120
    },

    // ── French Podcasts (6 Shows) ──
    {
      id: 'podcast-fr-1',
      roomId: 'room-fr-501',
      roomName: 'Salon de Paris',
      creatorId: 14,
      creatorName: 'Claire Dubois (Super Host)',
      title: 'Apprendre le Français Facilement: L’Art de la Conversation à Paris',
      durationSec: 345,
      fileUrl: '/uploads/podcasts/podcast-fr-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 26 - Intermediate French',
      createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
      listenCount: 2210
    },
    {
      id: 'podcast-fr-2',
      roomId: 'room-fr-502',
      roomName: 'DELF B2 Preparation',
      creatorId: 15,
      creatorName: 'Pierre Moreau',
      title: 'Préparation au DELF B2: Argumentation et Débats en Français',
      durationSec: 420,
      fileUrl: '/uploads/podcasts/podcast-fr-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 40 - Advanced French',
      createdAt: new Date(Date.now() - 3600000 * 160).toISOString(),
      listenCount: 1680
    },
    {
      id: 'podcast-fr-3',
      roomId: 'room-fr-503',
      roomName: 'French Cinema & Literature',
      creatorId: 14,
      creatorName: 'Claire Dubois (Super Host)',
      title: 'Le Cinéma Français et les Clichés de la Nouvelle Vague',
      durationSec: 390,
      fileUrl: '/uploads/podcasts/podcast-fr-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 44 - Cultural French',
      createdAt: new Date(Date.now() - 3600000 * 75).toISOString(),
      listenCount: 1940
    },
    {
      id: 'podcast-fr-4',
      roomId: 'room-fr-504',
      roomName: 'French Argot & Verlan Slang',
      creatorId: 15,
      creatorName: 'Pierre Moreau',
      title: 'Le Verlan et l’Argot des Jeunes Parisiens',
      durationSec: 270,
      fileUrl: '/uploads/podcasts/podcast-fr-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 32 - Slang Mastery',
      createdAt: new Date(Date.now() - 3600000 * 105).toISOString(),
      listenCount: 2850
    },
    {
      id: 'podcast-fr-5',
      roomId: 'room-fr-505',
      roomName: 'Wine & French Gastronomy',
      creatorId: 14,
      creatorName: 'Claire Dubois (Super Host)',
      title: 'La Gastronomie Française et le Vocabulaire de la Dégustation de Vin',
      durationSec: 360,
      fileUrl: '/uploads/podcasts/podcast-fr-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 36 - Gourmet French',
      createdAt: new Date(Date.now() - 3600000 * 135).toISOString(),
      listenCount: 1720
    },
    {
      id: 'podcast-fr-6',
      roomId: 'room-fr-506',
      roomName: 'Québécois French Expressions',
      creatorId: 15,
      creatorName: 'Pierre Moreau',
      title: 'Le Français du Québec vs le Français de France: Différences et Expressions',
      durationSec: 330,
      fileUrl: '/uploads/podcasts/podcast-fr-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1519832979-6fa011b87667?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 48 - International French',
      createdAt: new Date(Date.now() - 3600000 * 170).toISOString(),
      listenCount: 1390
    },

    // ── German Podcasts (5 Shows) ──
    {
      id: 'podcast-de-1',
      roomId: 'room-de-601',
      roomName: 'Berliner Deutsch Klub',
      creatorId: 16,
      creatorName: 'Max Schneider',
      title: 'Deutsch Lernen im Alltag: Dialoge und Redewendungen in Berlin',
      durationSec: 310,
      fileUrl: '/uploads/podcasts/podcast-de-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 20 - Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
      listenCount: 1490
    },
    {
      id: 'podcast-de-2',
      roomId: 'room-de-602',
      roomName: 'Goethe-Zertifikat B2 Prep',
      creatorId: 16,
      creatorName: 'Max Schneider',
      title: 'Vorbereitung auf das Goethe-Zertifikat B2: Sprechen & Argumentieren',
      durationSec: 410,
      fileUrl: '/uploads/podcasts/podcast-de-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 42 - Goethe B2 Level',
      createdAt: new Date(Date.now() - 3600000 * 90).toISOString(),
      listenCount: 1820
    },
    {
      id: 'podcast-de-3',
      roomId: 'room-de-603',
      roomName: 'German Automotive & Tech',
      creatorId: 16,
      creatorName: 'Max Schneider',
      title: 'Ingenieurwesen und Automobilfachsprache auf Deutsch',
      durationSec: 370,
      fileUrl: '/uploads/podcasts/podcast-de-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 52 - Technical German',
      createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
      listenCount: 1640
    },
    {
      id: 'podcast-de-4',
      roomId: 'room-de-604',
      roomName: 'Bavaria & Oktoberfest Culture',
      creatorId: 16,
      creatorName: 'Max Schneider',
      title: 'Bayerische Kultur, Dialekte und Traditionen in München',
      durationSec: 290,
      fileUrl: '/uploads/podcasts/podcast-de-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 35 - Cultural German',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 2100
    },
    {
      id: 'podcast-de-5',
      roomId: 'room-de-605',
      roomName: 'German Philosophy & Literature',
      creatorId: 16,
      creatorName: 'Max Schneider',
      title: 'Einführung in die Deutsche Philosophie: Goethe, Kant und Nietzsche',
      durationSec: 480,
      fileUrl: '/uploads/podcasts/podcast-de-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 60 - Advanced Philosophy',
      createdAt: new Date(Date.now() - 3600000 * 190).toISOString(),
      listenCount: 1250
    },

    // ── Korean Podcasts (6 Shows) ──
    {
      id: 'podcast-ko-1',
      roomId: 'room-ko-701',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 17,
      creatorName: 'Min-jun Kim (Super Host)',
      title: '리얼 한국어 회화: 서울에서 자주 쓰는 일상 표현 (Real Korean Conversations in Seoul)',
      durationSec: 290,
      fileUrl: '/uploads/podcasts/podcast-ko-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 32 - Intermediate Korean',
      createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
      listenCount: 2890
    },
    {
      id: 'podcast-ko-2',
      roomId: 'room-ko-702',
      roomName: 'K-Drama & K-Pop Korean',
      creatorId: 18,
      creatorName: 'Ji-won Park',
      title: 'K-드라마 대사로 배우는 유용한 한국어 (Useful Korean Expressions from K-Dramas)',
      durationSec: 325,
      fileUrl: '/uploads/podcasts/podcast-ko-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 25 - Elementary Korean',
      createdAt: new Date(Date.now() - 3600000 * 190).toISOString(),
      listenCount: 3450
    },
    {
      id: 'podcast-ko-3',
      roomId: 'room-ko-703',
      roomName: 'TOPIK II Exam Prep',
      creatorId: 17,
      creatorName: 'Min-jun Kim (Super Host)',
      title: 'TOPIK II 듣기 및 쓰기 영역 완벽 대비 (TOPIK II Listening & Writing Mastery)',
      durationSec: 430,
      fileUrl: '/uploads/podcasts/podcast-ko-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 48 - TOPIK Level 4',
      createdAt: new Date(Date.now() - 3600000 * 80).toISOString(),
      listenCount: 2180
    },
    {
      id: 'podcast-ko-4',
      roomId: 'room-ko-704',
      roomName: 'Korean BBQ & Street Food',
      creatorId: 18,
      creatorName: 'Ji-won Park',
      title: '한국 맛집 탐방: 삼겹살과 포장마차 주문 표현 (Ordering Food at Korean BBQ & Pocha)',
      durationSec: 265,
      fileUrl: '/uploads/podcasts/podcast-ko-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 20 - Practical Korean',
      createdAt: new Date(Date.now() - 3600000 * 110).toISOString(),
      listenCount: 3890
    },
    {
      id: 'podcast-ko-5',
      roomId: 'room-ko-705',
      roomName: 'Business Korean in Gangnam',
      creatorId: 17,
      creatorName: 'Min-jun Kim (Super Host)',
      title: '강남 비즈니스 한국어: 경어와 직장 내 이메일 작성법 (Gangnam Business Korean & Honorifics)',
      durationSec: 380,
      fileUrl: '/uploads/podcasts/podcast-ko-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 52 - Business Honorifics',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 1940
    },
    {
      id: 'podcast-ko-6',
      roomId: 'room-ko-706',
      roomName: 'Korean Traditional Culture',
      creatorId: 18,
      creatorName: 'Ji-won Park',
      title: '한옥 마을과 한국의 전통 절기 문화 (Hanok Villages & Korean Seasonal Customs)',
      durationSec: 350,
      fileUrl: '/uploads/podcasts/podcast-ko-1.wav',
      coverUrl: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 40 - Korean Heritage',
      createdAt: new Date(Date.now() - 3600000 * 170).toISOString(),
      listenCount: 1520
    }
  ];

  for (const item of seedData) {
    insertPod.run(
      item.id,
      item.roomId,
      item.roomName,
      item.creatorId,
      item.creatorName,
      item.title,
      item.durationSec,
      item.fileUrl,
      item.coverUrl,
      item.language,
      item.levelName,
      item.createdAt,
      item.listenCount
    );
  }
  console.log(`Seeded ${seedData.length} Spotify-style language podcasts into database.`);
}

export default db;

