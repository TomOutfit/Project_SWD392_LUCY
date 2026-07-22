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

// Seed sample podcasts if table is empty
const { count: pCount } = sqlite.prepare('SELECT COUNT(*) as count FROM podcasts').get() as { count: number };
if (pCount === 0) {
  const insertPod = sqlite.prepare(`
    INSERT INTO podcasts (id, room_id, room_name, creator_id, creator_name, title, duration_sec, file_url, language, level_name, created_at, listen_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPod.run(
    'sample-podcast-1',
    'room-sample-1',
    'English Fluency Practice',
    1,
    'Sarah Jenkins',
    'Mastering Daily English Communication & Pronunciation',
    184,
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'EN',
    'Level 12 - Intermediate English',
    new Date().toISOString(),
    42
  );
  insertPod.run(
    'sample-podcast-2',
    'room-sample-2',
    'Japanese Culture & Daily Conversation',
    2,
    'Kenji Sato',
    'Essential Japanese Greetings & Conversational Etiquette',
    215,
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'JA',
    'Level 45 - Beginner Japanese',
    new Date(Date.now() - 86400000).toISOString(),
    128
  );
  console.log('Seeded sample podcasts into database.');
}

export default db;
