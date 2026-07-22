import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/lucy.db');

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
    description TEXT,
    duration_sec INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    language TEXT NOT NULL,
    level_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    listen_count INTEGER NOT NULL DEFAULT 0
  );
`);

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
  const langNames = { EN: 'English', ZH: 'Chinese', JA: 'Japanese', ES: 'Spanish', FR: 'French', DE: 'German', KO: 'Korean' };

  for (let id = 1; id <= 100; id++) {
    const stage = id <= 34 ? 1 : id <= 67 ? 2 : 3;
    const subLevel = ((id - 1) % 12) + 1;
    const langKeys = ['EN', 'ZH', 'JA', 'ES', 'FR', 'DE', 'KO'];
    const lang = langKeys[Math.floor((id - 1) / 15) % langKeys.length];
    const langName = langNames[lang as keyof typeof langNames] || 'English';

    const content = {
      vocabulary: [`word-${id}-a`, `word-${id}-b`, `word-${id}-c`, `word-${id}-d`, `phrase-${id}`],
      conversationPrompts: [
        `Practice introducing yourself at ${langName} level ${id}`,
        `Role-play ordering food in ${langName} language`,
        `Discuss your daily routine using level ${id} vocabulary`,
      ],
      grammarTips: [
        `Grammar point for level ${id}: ${stageNames[stage - 1]} structures`,
        `Common pattern in ${langName} level ${id}`,
      ],
      aiSuggestedQuestions: [
        `What did you do last weekend? (Level ${id} vocabulary)`,
        `Can you describe your hometown?`,
        `How would you ask for directions in ${langName}?`,
      ],
    };

    insert.run(id, `Level ${id} - ${stageNames[stage - 1]} ${langName}`, lang, stage, subLevel, JSON.stringify(content));
  }
  console.log('Seeded 100 levels into database.');
}

addColumnIfMissing('podcasts', 'cover_url', 'TEXT');
addColumnIfMissing('podcasts', 'description', 'TEXT');
addColumnIfMissing('podcasts', 'spotify_url', 'TEXT');

// Seed 25+ Language Learning Podcasts
const { count: pCount } = sqlite.prepare('SELECT COUNT(*) as count FROM podcasts').get() as { count: number };
if (pCount < 25) {
  sqlite.prepare("DELETE FROM podcasts WHERE id LIKE 'sample-%' OR id LIKE 'podcast-%'").run();

  const insertPod = sqlite.prepare(`
    INSERT INTO podcasts (id, room_id, room_name, creator_id, creator_name, title, description, duration_sec, file_url, cover_url, language, level_name, created_at, listen_count, spotify_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const seedData = [
    // ── English ──
    {
      id: 'podcast-en-001',
      roomId: 'room-en-001',
      roomName: 'English Listening Practice',
      creatorId: 1,
      creatorName: 'Daily English Talk',
      title: 'My Daily Routine in English | A1-B1 Slow Practice',
      description: 'Learn daily routine vocabulary through a real conversation in Los Angeles. Slow, natural American English. 10 essential phrases per episode.',
      durationSec: 1120,
      fileUrl: 'https://www.youtube.com/embed/BMnEsJmo1mI',
      coverUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 12 - Beginner English',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      listenCount: 8420,
      spotifyUrl: null
    },
    {
      id: 'podcast-en-002',
      roomId: 'room-en-002',
      roomName: 'English Conversation',
      creatorId: 1,
      creatorName: 'English Speaking Course',
      title: 'Daily English Conversations for Beginners | 30-Minute Marathon',
      description: '30 minutes of daily English conversations at beginner A1-A2 level. Natural dialogues: at the restaurant, shopping, asking directions.',
      durationSec: 1830,
      fileUrl: 'https://www.youtube.com/embed/0Edw8BpLJpM',
      coverUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 8 - Beginner English',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      listenCount: 7310,
      spotifyUrl: null
    },
    {
      id: 'podcast-en-003',
      roomId: 'room-en-003',
      roomName: 'Slow English Practice',
      creatorId: 1,
      creatorName: 'ABC Learning English',
      title: 'Daily Life Slow English | Travel & Conversation (A2-B1)',
      description: 'Daily life slow English conversation with subtitles. Topics: traveling, airport, ordering food. Perfect for shadowing practice.',
      durationSec: 900,
      fileUrl: 'https://www.youtube.com/embed/V7sLqYbyv8I',
      coverUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 16 - Pre-Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 6540,
      spotifyUrl: null
    },
    {
      id: 'podcast-en-004',
      roomId: 'room-en-004',
      roomName: 'Business English',
      creatorId: 1,
      creatorName: 'English4Success',
      title: 'Business Meeting English | B1-B2 Professional Conversations',
      description: 'Practice business English through realistic meeting dialogues. Job interviews, negotiations, email phrases, and office small talk for intermediate learners.',
      durationSec: 1340,
      fileUrl: 'https://www.youtube.com/embed/Z2JyeSSrD84',
      coverUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 20 - Intermediate English',
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
      listenCount: 5890,
      spotifyUrl: null
    },
    {
      id: 'podcast-en-005',
      roomId: 'room-en-005',
      roomName: 'IELTS Listening',
      creatorId: 2,
      creatorName: 'IELTS Mastery',
      title: 'IELTS Listening Practice Test 1 | Academic Module',
      description: 'Full IELTS listening test with British accent practice. Sections 1-4, academic topics: university lectures, library, enrollment process.',
      durationSec: 2400,
      fileUrl: 'https://www.youtube.com/embed/VUtUOTrJ2Kk',
      coverUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 45 - Advanced English',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 11200,
      spotifyUrl: null
    },
    // ── Japanese ──
    {
      id: 'podcast-ja-001',
      roomId: 'room-ja-001',
      roomName: 'Japanese N5 Practice',
      creatorId: 7,
      creatorName: 'Nihongo Con Teppei',
      title: 'Japanese for Beginners #1: 元気ですか？| Nihongo Con Teppei',
      description: 'Nihongo con Teppei Episode 1. Natural beginner Japanese conversation. "元気ですか？" — learn to introduce yourself and greet in Japanese.',
      durationSec: 240,
      fileUrl: 'https://www.youtube.com/embed/drTGtJEvRCA',
      coverUrl: 'https://images.unsplash.com/photo-1528164344705-47542687990d?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 38 - Beginner Japanese',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 7890,
      spotifyUrl: null
    },
    {
      id: 'podcast-ja-002',
      roomId: 'room-ja-002',
      roomName: 'Japanese Grammar',
      creatorId: 7,
      creatorName: 'Nihongo Con Teppei',
      title: 'Japanese Grammar Study 文法の勉強 | Nihongo Con Teppei',
      description: 'Nihongo con Teppei: how to study grammar naturally in Japanese. Natural pace, beginner-friendly. 1500+ episodes available on the channel.',
      durationSec: 400,
      fileUrl: 'https://www.youtube.com/embed/eJYchAcCkkI',
      coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 40 - Intermediate Japanese',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 5600,
      spotifyUrl: null
    },
    {
      id: 'podcast-ja-003',
      roomId: 'room-ja-003',
      roomName: 'JLPT N3 Listening',
      creatorId: 7,
      creatorName: 'Japanese Ammo',
      title: 'JLPT N3 Listening Drill | 日本語能力試験 N3',
      description: 'JLPT N3 level Japanese listening practice. Real exam-style conversations about daily life, travel plans, and work situations.',
      durationSec: 1800,
      fileUrl: 'https://www.youtube.com/embed/ze_id04vySI',
      coverUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 42 - Upper Intermediate Japanese',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      listenCount: 6340,
      spotifyUrl: null
    },
    {
      id: 'podcast-ja-004',
      roomId: 'room-ja-004',
      roomName: 'Japanese Culture Talk',
      creatorId: 7,
      creatorName: 'Japanese Pod 101',
      title: 'Japanese Culture 101 | 日本文化を学ぶ',
      description: 'Learn Japanese culture and language together. Japanese Pod 101 — popular culture, festivals, food, and everyday customs explained in simple Japanese.',
      durationSec: 720,
      fileUrl: 'https://www.youtube.com/embed/riDaz7OMn74',
      coverUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 35 - Intermediate Japanese',
      createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      listenCount: 4820,
      spotifyUrl: null
    },
    // ── Chinese ──
    {
      id: 'podcast-zh-001',
      roomId: 'room-zh-001',
      roomName: 'HSK Listening',
      creatorId: 10,
      creatorName: 'BaoBao Mandarin',
      title: 'HSK 1-3 | Summer Vacation 暑假怎么过？| Mandarin Listening',
      description: 'BaoBao Mandarin HSK1-3 listening: Xiao Ming & Xiao Yue discuss summer vacation in simple Chinese. Perfect for beginners at HSK 1-3 level.',
      durationSec: 960,
      fileUrl: 'https://www.youtube.com/embed/kYWhcTKJiUA',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 55 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 4812,
      spotifyUrl: null
    },
    {
      id: 'podcast-zh-002',
      roomId: 'room-zh-002',
      roomName: 'Chinese Conversation',
      creatorId: 10,
      creatorName: 'Learn Chinese Through Podcast',
      title: 'HSK 1-2 | Learn to Believe in Yourself 学语言相信自己',
      description: 'Learn Chinese Through Podcast: learn to believe in yourself through simple Chinese stories. HSK1-3 listening practice with English subtitles.',
      durationSec: 1070,
      fileUrl: 'https://www.youtube.com/embed/52j_FAJ-I4Q',
      coverUrl: 'https://images.unsplash.com/photo-1543959796-1df8-b0821acd9e36?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 52 - Upper Intermediate Chinese',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      listenCount: 3200,
      spotifyUrl: null
    },
    {
      id: 'podcast-zh-003',
      roomId: 'room-zh-003',
      roomName: 'Mandarin Pod',
      creatorId: 10,
      creatorName: 'ChineseClass101',
      title: 'Chinese Reading & Listening | 中文阅读听力练习',
      description: 'ChineseClass101: combined reading and listening practice for intermediate learners. Culture notes and vocabulary breakdown included.',
      durationSec: 1200,
      fileUrl: 'https://www.youtube.com/embed/d2dl8kIjL5I',
      coverUrl: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 58 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
      listenCount: 2780,
      spotifyUrl: null
    },
    // ── Spanish ──
    {
      id: 'podcast-es-001',
      roomId: 'room-es-001',
      roomName: 'Spanish Conversation',
      creatorId: 5,
      creatorName: 'SpanishMiniTalks',
      title: '25 Minutes Daily Spanish Conversation | Slow A1-A2 Beginners',
      description: '8 short Spanish dialogues for beginners (A1-A2). Real-life conversations: at the restaurant, shopping, meeting friends. Slow & clear Spanish.',
      durationSec: 1480,
      fileUrl: 'https://www.youtube.com/embed/OnC0P3rABZ0',
      coverUrl: 'https://images.unsplash.com/photo-1513740051206-8d63a48e6522?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 22 - Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      listenCount: 3950,
      spotifyUrl: null
    },
    {
      id: 'podcast-es-002',
      roomId: 'room-es-002',
      roomName: 'Spanish Travel',
      creatorId: 5,
      creatorName: 'EspaTalks',
      title: '60 Minutes Spanish Conversations | Slow A1-A2 Travel Dialogues',
      description: '60 minutes of practical Spanish conversations. Topics: airport, hotel, restaurant, asking directions, tapas bar, shopping in Spain.',
      durationSec: 3490,
      fileUrl: 'https://www.youtube.com/embed/97lRz5fQgFY',
      coverUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 20 - Pre-Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      listenCount: 3420,
      spotifyUrl: null
    },
    {
      id: 'podcast-es-003',
      roomId: 'room-es-003',
      roomName: 'Spanish Family',
      creatorId: 5,
      creatorName: 'El Eco del Espanol',
      title: 'Family & Relationships | 10 Slow Spanish Conversations A1-B1',
      description: 'Spanish vocabulary through family and relationships. 10 slow dialogues: introducing family, siblings, grandparents, wedding. With English subtitles.',
      durationSec: 2240,
      fileUrl: 'https://www.youtube.com/embed/uA4NkgPjSeM',
      coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 35 - Upper Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 2180,
      spotifyUrl: null
    },
    {
      id: 'podcast-es-004',
      roomId: 'room-es-004',
      roomName: 'Spanish News',
      creatorId: 5,
      creatorName: 'News in Slow Spanish',
      title: 'News in Slow Spanish | Weekly News Digest B1-B2',
      description: 'News in slow Spanish — weekly world news explained in clear, slow Spanish. Perfect for intermediate learners wanting to stay updated.',
      durationSec: 2700,
      fileUrl: 'https://www.youtube.com/embed/Fyf9eAB5YJE',
      coverUrl: 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 30 - Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
      listenCount: 1650,
      spotifyUrl: null
    },
    // ── French ──
    {
      id: 'podcast-fr-001',
      roomId: 'room-fr-001',
      roomName: 'Slow French',
      creatorId: 3,
      creatorName: 'French Facile',
      title: 'Slow French Listening Practice in France | Vlog FR/EN Subtitles',
      description: 'Slow French listening practice in France. French Facile channel: real vlog in slow French with French & English subtitles. A1-B1 level.',
      durationSec: 510,
      fileUrl: 'https://www.youtube.com/embed/Jt-hHn8Uzn4',
      coverUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 10 - Beginner French',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 5210,
      spotifyUrl: null
    },
    {
      id: 'podcast-fr-002',
      roomId: 'room-fr-002',
      roomName: 'French Pronunciation',
      creatorId: 3,
      creatorName: 'Learn French With Alexa',
      title: 'Learn to Read French With Me | A1/A2 Level French Pronunciation',
      description: 'Learn to read French with Alexa. A1/A2 level: practice pronunciation, basic phrases, and reading skills. Clear French for absolute beginners.',
      durationSec: 800,
      fileUrl: 'https://www.youtube.com/embed/2jWFEQSu8Ic',
      coverUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 26 - Intermediate French',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 4320,
      spotifyUrl: null
    },
    {
      id: 'podcast-fr-003',
      roomId: 'room-fr-003',
      roomName: 'French Culture',
      creatorId: 3,
      creatorName: 'Français Authentique',
      title: 'French Culture & Authentic Conversations | B1-B2',
      description: 'Français Authentique: discover French culture through authentic conversations. Idiomatic expressions, everyday French slang, and cultural insights.',
      durationSec: 1100,
      fileUrl: 'https://www.youtube.com/embed/2ld6lJu3-XU',
      coverUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 32 - Advanced French',
      createdAt: new Date(Date.now() - 3600000 * 160).toISOString(),
      listenCount: 3870,
      spotifyUrl: null
    },
    // ── German ──
    {
      id: 'podcast-de-001',
      roomId: 'room-de-001',
      roomName: 'Super Easy German',
      creatorId: 6,
      creatorName: 'Easy German',
      title: 'At the Bakery in Slow German | Super Easy German 271',
      description: 'Easy German "Super Easy German 271": at the bakery in Berlin. Slow, clear German with German subtitles. A1-B1 level. Real street interviews.',
      durationSec: 890,
      fileUrl: 'https://www.youtube.com/embed/1bFgK6wtuNY',
      coverUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 20 - Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
      listenCount: 3490,
      spotifyUrl: null
    },
    {
      id: 'podcast-de-002',
      roomId: 'room-de-002',
      roomName: 'German Dialogues',
      creatorId: 6,
      creatorName: 'Deutsch lernen - Lesen & Hoeren',
      title: 'German Dialogues for Beginners | 6 Slow Conversations A1-B1 (4h)',
      description: 'Over 4 hours of slow, real German conversations for beginners (A1-B1). 6 immersive dialogues: daily life, travel, shopping in Germany.',
      durationSec: 13960,
      fileUrl: 'https://www.youtube.com/embed/eQmJPskzmOM',
      coverUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 35 - Upper Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 90).toISOString(),
      listenCount: 2180,
      spotifyUrl: null
    },
    {
      id: 'podcast-de-003',
      roomId: 'room-de-003',
      roomName: 'DW German',
      creatorId: 6,
      creatorName: 'DW Deutsch lernen',
      title: 'A1-B1 German Listening | DW Deutsche Welle Learning Series',
      description: 'Deutsche Welle official German learning series. Top courses: Nicos Weg A1-B1, Alltagsdeutsch, ZDF heute. Most comprehensive German resource.',
      durationSec: 3200,
      fileUrl: 'https://www.youtube.com/embed/6335zlYpRnc',
      coverUrl: 'https://images.unsplash.com/photo-1569424800804-3b0b2c3e5f96?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 15 - Pre-Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 180).toISOString(),
      listenCount: 4120,
      spotifyUrl: null
    },
    // ── Korean ──
    {
      id: 'podcast-ko-001',
      roomId: 'room-ko-001',
      roomName: 'Korean TTMIK',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean',
      title: 'How to REALLY Start Learning Korean | TTMIK',
      description: 'TTMIK official: how to start learning Korean. Hangeul lesson, study tips, comprehensible input method. Free on YouTube. B1-B2 natural Korean.',
      durationSec: 540,
      fileUrl: 'https://www.youtube.com/embed/KzROrdoFpZA',
      coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 32 - Intermediate Korean',
      createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
      listenCount: 9290,
      spotifyUrl: null
    },
    {
      id: 'podcast-ko-002',
      roomId: 'room-ko-002',
      roomName: 'Korean TOPIK',
      creatorId: 9,
      creatorName: 'Korean Topik',
      title: 'Korean Conversation Beginner 2 | Lesson 2 (Sejeong Korean)',
      description: 'Korean Topik: Korean conversation for beginners using Sejong Korean dialogues. Real TOPIK-style listening practice. A1-A2 level.',
      durationSec: 180,
      fileUrl: 'https://www.youtube.com/embed/5_SE3p-fdPk',
      coverUrl: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 4 - Beginner Korean',
      createdAt: new Date(Date.now() - 3600000 * 100).toISOString(),
      listenCount: 7840,
      spotifyUrl: null
    },
    {
      id: 'podcast-ko-003',
      roomId: 'room-ko-003',
      roomName: 'Korean 100%',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean 100%',
      title: 'Talk To Me In 100% Korean | Upper-Intermediate Conversations',
      description: "TTMIK 100% Korean: Kyung-hwa and guests discuss personal habits and culture in natural Korean. Upper-intermediate B2-C1 learners.",
      durationSec: 880,
      fileUrl: 'https://www.youtube.com/embed/fpZ7vHBA_n4',
      coverUrl: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 45 - Advanced Korean',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 5620,
      spotifyUrl: null
    },
    {
      id: 'podcast-ko-004',
      roomId: 'room-ko-004',
      roomName: 'Korean K-Drama',
      creatorId: 9,
      creatorName: 'KoreanClass101',
      title: 'K-Drama Korean | Watch K-Drama & Learn Korean Naturally',
      description: 'KoreanClass101: learn Korean through popular K-drama dialogues. Real sentences from Korean dramas explained with grammar breakdown.',
      durationSec: 1050,
      fileUrl: 'https://www.youtube.com/embed/0ggN4OngqxI',
      coverUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 25 - Intermediate Korean',
      createdAt: new Date(Date.now() - 3600000 * 220).toISOString(),
      listenCount: 6980,
      spotifyUrl: null
    },
    // ── Portuguese ──
    {
      id: 'podcast-pt-001',
      roomId: 'room-pt-001',
      roomName: 'Brazilian Portuguese',
      creatorId: 11,
      creatorName: 'Brasil Economy',
      title: 'Slow Brazilian Portuguese | A1-A2 Beginner Conversations',
      description: 'Brazilian Portuguese slow conversations for beginners. Topics: meeting people, daily routine, food, shopping. Clear Rio accent with subtitles.',
      durationSec: 1340,
      fileUrl: 'https://www.youtube.com/embed/F4kkcixQ9D4',
      coverUrl: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?q=80&w=800&auto=format&fit=crop',
      language: 'PT',
      levelName: 'Level 5 - Beginner Portuguese',
      createdAt: new Date(Date.now() - 3600000 * 80).toISOString(),
      listenCount: 2340,
      spotifyUrl: null
    },
    {
      id: 'podcast-pt-002',
      roomId: 'room-pt-002',
      roomName: 'Portuguese Culture',
      creatorId: 11,
      creatorName: 'Coffee Break Portuguese',
      title: 'Portuguese Culture & Language | B1-B2 Cultural Immersion',
      description: 'Coffee Break Portuguese: explore Lusophone culture through language. Brazilian music, Portuguese history, and everyday conversations.',
      durationSec: 1680,
      fileUrl: 'https://www.youtube.com/embed/iCxRfgi4hBU',
      coverUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
      language: 'PT',
      levelName: 'Level 18 - Intermediate Portuguese',
      createdAt: new Date(Date.now() - 3600000 * 130).toISOString(),
      listenCount: 1870,
      spotifyUrl: null
    },
    // ── Italian ──
    {
      id: 'podcast-it-001',
      roomId: 'room-it-001',
      roomName: 'Italian Coffee Break',
      creatorId: 12,
      creatorName: 'Coffee Break Italian',
      title: 'Italian for Beginners | Caffè e Conversazione A1',
      description: 'Coffee Break Italian: Italian coffee break conversations. Learn basic Italian through everyday dialogues. Slow, clear Italian for beginners.',
      durationSec: 920,
      fileUrl: 'https://www.youtube.com/embed/63Jh_MwBKtU',
      coverUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=800&auto=format&fit=crop',
      language: 'IT',
      levelName: 'Level 3 - Beginner Italian',
      createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
      listenCount: 3100,
      spotifyUrl: null
    },
    {
      id: 'podcast-it-002',
      roomId: 'room-it-002',
      roomName: 'Italian Culture',
      creatorId: 12,
      creatorName: 'News in Slow Italian',
      title: 'News in Slow Italian | Attualità e Cultura B1-B2',
      description: 'News in slow Italian — current events and culture explained in clear, measured Italian. Perfect for intermediate learners expanding vocabulary.',
      durationSec: 2100,
      fileUrl: 'https://www.youtube.com/embed/F9gbTerGheg',
      coverUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=800&auto=format&fit=crop',
      language: 'IT',
      levelName: 'Level 22 - Intermediate Italian',
      createdAt: new Date(Date.now() - 3600000 * 190).toISOString(),
      listenCount: 1480,
      spotifyUrl: null
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
      item.description,
      item.durationSec,
      item.fileUrl,
      item.coverUrl,
      item.language,
      item.levelName,
      item.createdAt,
      item.listenCount,
      item.spotifyUrl ?? null
    );
  }
  console.log(`Seeded ${seedData.length} top Spotify language podcasts into database.`);
}

export default db;