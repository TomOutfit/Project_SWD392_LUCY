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

// Seed sample podcasts if table is empty or has only initial test items
const { count: pCount } = sqlite.prepare('SELECT COUNT(*) as count FROM podcasts').get() as { count: number };
if (pCount < 5) {
  sqlite.prepare("DELETE FROM podcasts WHERE id LIKE 'sample-%' OR id LIKE 'podcast-%'").run();
  const insertPod = sqlite.prepare(`
    INSERT INTO podcasts (id, room_id, room_name, creator_id, creator_name, title, duration_sec, file_url, language, level_name, created_at, listen_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedData = [
    {
      id: 'podcast-en-1',
      roomId: 'room-en-101',
      roomName: 'Business English Intensive',
      creatorId: 1,
      creatorName: 'Sarah Jenkins (Super Host)',
      title: 'Mastering Business English: Professional Email Etiquette & Meetings',
      durationSec: 245,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      language: 'EN',
      levelName: 'Level 18 - Intermediate English',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      listenCount: 342
    },
    {
      id: 'podcast-ja-1',
      roomId: 'room-ja-202',
      roomName: 'Tokyo Speaking Lounge',
      creatorId: 2,
      creatorName: 'Kenji Sato (Super Host)',
      title: '日常会話と敬語 (Daily Japanese & Politeness Levels in Tokyo)',
      durationSec: 310,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      language: 'JA',
      levelName: 'Level 42 - Intermediate Japanese',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 289
    },
    {
      id: 'podcast-zh-1',
      roomId: 'room-zh-303',
      roomName: 'Mandarin Fluency Hub',
      creatorId: 3,
      creatorName: 'Wei Zhang (Super Host)',
      title: 'HSK 4 核心词汇与商务谈判 (HSK 4 Core Vocab & Negotiation Phrases)',
      durationSec: 198,
      fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      language: 'ZH',
      levelName: 'Level 55 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 512
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
      language: 'EN',
      levelName: 'Level 24 - Upper Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 198
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
      language: 'JA',
      levelName: 'Level 38 - Beginner Japanese',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      listenCount: 640
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
      language: 'ZH',
      levelName: 'Level 15 - Elementary Chinese',
      createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      listenCount: 380
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
      language: 'EN',
      levelName: 'Level 30 - Advanced English',
      createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
      listenCount: 890
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
      language: 'JA',
      levelName: 'Level 50 - JLPT N3 Level',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 410
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
      item.language,
      item.levelName,
      item.createdAt,
      item.listenCount
    );
  }
  console.log(`Seeded ${seedData.length} realistic language podcasts into database.`);
}

export default db;
