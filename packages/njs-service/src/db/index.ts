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

// Seed sample podcasts if table has fewer than 20 podcasts
const { count: pCount } = sqlite.prepare('SELECT COUNT(*) as count FROM podcasts').get() as { count: number };
if (pCount < 20) {
  sqlite.prepare("DELETE FROM podcasts WHERE id LIKE 'sample-%' OR id LIKE 'podcast-%'").run();
  const insertPod = sqlite.prepare(`
    INSERT INTO podcasts (id, room_id, room_name, creator_id, creator_name, title, duration_sec, file_url, cover_url, language, level_name, created_at, listen_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedData = [
    // ── English Podcasts ──
    {
      id: 'podcast-en-1',
      roomId: 'room-en-101',
      roomName: 'Business English Intensive',
      creatorId: 1,
      creatorName: 'Sarah Jenkins (Super Host)',
      title: 'Mastering Business English: Professional Email Etiquette & Meetings',
      durationSec: 245,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 14 - Pre-Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 180).toISOString(),
      listenCount: 3100
    },

    // ── Japanese Podcasts ──
    {
      id: 'podcast-ja-1',
      roomId: 'room-ja-202',
      roomName: 'Tokyo Speaking Lounge',
      creatorId: 2,
      creatorName: 'Kenji Sato (Super Host)',
      title: '日常会話と敬語 (Daily Japanese & Politeness Levels in Tokyo)',
      durationSec: 310,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 48 - Advanced Japanese',
      createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
      listenCount: 1120
    },

    // ── Chinese Podcasts ──
    {
      id: 'podcast-zh-1',
      roomId: 'room-zh-303',
      roomName: 'Mandarin Fluency Hub',
      creatorId: 3,
      creatorName: 'Wei Zhang (Super Host)',
      title: 'HSK 4 核心词汇与商务谈判 (HSK 4 Core Vocab & Negotiation Phrases)',
      durationSec: 198,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 10 - Beginner Pinyin',
      createdAt: new Date(Date.now() - 3600000 * 210).toISOString(),
      listenCount: 1840
    },

    // ── Spanish Podcasts ──
    {
      id: 'podcast-es-1',
      roomId: 'room-es-401',
      roomName: 'Café de Madrid',
      creatorId: 12,
      creatorName: 'Carlos Rossi (Super Host)',
      title: 'Hablar Español con Fluidez: Conversaciones Cotidianas en Madrid',
      durationSec: 320,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 35 - Upper Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 1270
    },

    // ── French Podcasts ──
    {
      id: 'podcast-fr-1',
      roomId: 'room-fr-501',
      roomName: 'Salon de Paris',
      creatorId: 14,
      creatorName: 'Claire Dubois (Super Host)',
      title: 'Apprendre le Français Facilement: L’Art de la Conversation à Paris',
      durationSec: 345,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 40 - Advanced French',
      createdAt: new Date(Date.now() - 3600000 * 160).toISOString(),
      listenCount: 1680
    },

    // ── German Podcasts ──
    {
      id: 'podcast-de-1',
      roomId: 'room-de-601',
      roomName: 'Berliner Deutsch Klub',
      creatorId: 16,
      creatorName: 'Max Schneider',
      title: 'Deutsch Lernen im Alltag: Dialoge und Redewendungen in Berlin',
      durationSec: 310,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 20 - Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
      listenCount: 1490
    },

    // ── Korean Podcasts ──
    {
      id: 'podcast-ko-1',
      roomId: 'room-ko-701',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 17,
      creatorName: 'Min-jun Kim (Super Host)',
      title: '리얼 한국어 회화: 서울에서 자주 쓰는 일상 표현 (Real Korean Conversations in Seoul)',
      durationSec: 290,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
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
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 25 - Elementary Korean',
      createdAt: new Date(Date.now() - 3600000 * 190).toISOString(),
      listenCount: 3450
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
