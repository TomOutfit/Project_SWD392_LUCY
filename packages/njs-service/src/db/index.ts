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

// Seed 10 Reputable Spotify Language Learning Podcasts
const { count: pCount } = sqlite.prepare('SELECT COUNT(*) as count FROM podcasts').get() as { count: number };
if (pCount < 10) {
  sqlite.prepare("DELETE FROM podcasts WHERE id LIKE 'sample-%' OR id LIKE 'podcast-%'").run();
  
  const insertPod = sqlite.prepare(`
    INSERT INTO podcasts (id, room_id, room_name, creator_id, creator_name, title, description, duration_sec, file_url, cover_url, language, level_name, created_at, listen_count, spotify_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const seedData = [
    // ── English: Daily English Conversation (verified episode-level URLs) ──
    {
      id: 'podcast-en-001',
      roomId: 'room-en-001',
      roomName: 'English Listening Practice',
      creatorId: 1,
      creatorName: 'Nguyen Van Quang',
      title: 'Bank English Conversation | B1 English Listening Practice',
      description: 'Practical B1 English conversation about banking — learn real vocabulary used at the bank, with accounts, deposits, and withdrawals.',
      durationSec: 300,
      fileUrl: 'https://open.spotify.com/embed/episode/7m1DUtGEWbQJEiD98ZieZU?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 14 - Pre-Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      listenCount: 8420,
      spotifyUrl: 'https://open.spotify.com/embed/episode/7m1DUtGEWbQJEiD98ZieZU?utm_source=generator'
    },
    {
      id: 'podcast-en-002',
      roomId: 'room-en-002',
      roomName: 'English Listening Practice',
      creatorId: 1,
      creatorName: 'Nguyen Van Quang',
      title: 'B1 Listening Practice Compilation | Daily English Conversations',
      description: 'B1-level daily English conversations for intermediate learners — natural pace, clear pronunciation, everyday topics.',
      durationSec: 360,
      fileUrl: 'https://open.spotify.com/embed/episode/6Du98qp56WWBapoN3vuOQj?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 16 - Pre-Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      listenCount: 7310,
      spotifyUrl: 'https://open.spotify.com/embed/episode/6Du98qp56WWBapoN3vuOQj?utm_source=generator'
    },
    {
      id: 'podcast-en-003',
      roomId: 'room-en-003',
      roomName: 'English Listening Practice',
      creatorId: 1,
      creatorName: 'Nguyen Van Quang',
      title: 'My Daily Routine in English | A2 English Listening Practice',
      description: 'A2-level English conversation about daily routines — wake up, commute, work, relax. Perfect for beginners building confidence.',
      durationSec: 300,
      fileUrl: 'https://open.spotify.com/embed/episode/52Qn9LN4FQdJDBCmpqv5lO?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 8 - Beginner English',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 6540,
      spotifyUrl: 'https://open.spotify.com/embed/episode/52Qn9LN4FQdJDBCmpqv5lO?utm_source=generator'
    },

    // ── Japanese: Nihongo through Anime ──
    {
      id: 'podcast-ja-001',
      roomId: 'room-ja-001',
      roomName: 'Japanese Through Anime',
      creatorId: 7,
      creatorName: 'Nihongo Con Teppei',
      title: 'Japanese Through Anime | Studio Ghibli Collection',
      description: 'Learn Japanese passively through Studio Ghibli anime. Native Japanese audio with cultural context. Howl Moving Castle, Ponyo, Totoro, Arrietty.',
      durationSec: 2520,
      fileUrl: 'https://open.spotify.com/embed/show/18G7IWPHXatk493YkUHLA1?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1528164344705-47542687990d?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 38 - Beginner Japanese',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 7890,
      spotifyUrl: 'https://open.spotify.com/embed/show/18G7IWPHXatk493YkUHLA1?utm_source=generator'
    },

    // ── Chinese: Luyen Nghe Tieng Trung | An Vu ──
    {
      id: 'podcast-zh-001',
      roomId: 'room-zh-001',
      roomName: 'Mandarin Listening Hub',
      creatorId: 10,
      creatorName: 'An Vu',
      title: 'HSK 4 Chinese Vocabulary and Samples | Mandarin Listening Practice',
      description: 'Mandarin Chinese listening practice at HSK4 level. An Vu teaches daily conversations, tone practice, and real-life Chinese expressions.',
      durationSec: 360,
      fileUrl: 'https://open.spotify.com/embed/episode/3Jia2e7EJI10FUIqDlfh3L?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 55 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 4812,
      spotifyUrl: 'https://open.spotify.com/embed/episode/3Jia2e7EJI10FUIqDlfh3L?utm_source=generator'
    },
    {
      id: 'podcast-zh-002',
      roomId: 'room-zh-002',
      roomName: 'Mandarin Listening Hub',
      creatorId: 10,
      creatorName: 'An Vu',
      title: 'Luyen Nghe Tieng Trung | An Vu — HSK4-5 Daily Conversations',
      description: 'Daily Mandarin Chinese conversations at HSK4-5 level. Topics: relationships, life stories, cultural insights. 5-8 min per episode.',
      durationSec: 360,
      fileUrl: 'https://open.spotify.com/embed/show/0yKVlqvezr9ay0GK8JP9QP?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1543959796-1df8-b0821acd9e36?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 55 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 3200,
      spotifyUrl: 'https://open.spotify.com/embed/show/0yKVlqvezr9ay0GK8JP9QP?utm_source=generator'
    },

    // ── Spanish: Duolingo Spanish Podcast ──
    {
      id: 'podcast-es-001',
      roomId: 'room-es-001',
      roomName: 'Madrid Spanish Club',
      creatorId: 5,
      creatorName: 'Duolingo Spanish Podcast',
      title: "Duo's Film Club: Wild Tales (Relatos Salvajes) | Argentine Spanish",
      description: "Duolingo Spanish Podcast episode about Argentina's Relatos salvajes. Cultural exploration through cinema. Hosted by Martina Castro.",
      durationSec: 1140,
      fileUrl: 'https://open.spotify.com/embed/episode/3a8MpljJr7CtSsWy5dhLgr?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1513740051206-8d63a48e6522?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 22 - Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      listenCount: 3950,
      spotifyUrl: 'https://open.spotify.com/embed/episode/3a8MpljJr7CtSsWy5dhLgr?utm_source=generator'
    },
    {
      id: 'podcast-es-002',
      roomId: 'room-es-002',
      roomName: 'Madrid Spanish Club',
      creatorId: 5,
      creatorName: 'Duolingo Spanish Podcast',
      title: 'Mothers of the Amazon River | Mexican Children\'s Day Celebration',
      description: 'Duolingo Spanish Podcast episode exploring Mexican culture — Children\'s Day celebration, traditions, and family life in Mexico.',
      durationSec: 1200,
      fileUrl: 'https://open.spotify.com/embed/episode/548YQwSgHC9hETNtF7FfjF?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 24 - Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      listenCount: 3420,
      spotifyUrl: 'https://open.spotify.com/embed/episode/548YQwSgHC9hETNtF7FfjF?utm_source=generator'
    },
    {
      id: 'podcast-es-003',
      roomId: 'room-es-003',
      roomName: 'Latin American Conversations',
      creatorId: 5,
      creatorName: 'Duolingo Spanish Podcast',
      title: 'El chocolate de hoy | Cultural Spanish Conversations in Mexico',
      description: "Duolingo Spanish Podcast episode about Mexican chocolate culture and daily conversations. Real stories in easy Spanish.",
      durationSec: 1080,
      fileUrl: 'https://open.spotify.com/embed/episode/2IIi0lOo1f8EXvwV0P8xtw?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 20 - Pre-Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 2180,
      spotifyUrl: 'https://open.spotify.com/embed/episode/2IIi0lOo1f8EXvwV0P8xtw?utm_source=generator'
    },

    // ── French: 1 Minute in Slow French ──
    {
      id: 'podcast-fr-001',
      roomId: 'room-fr-001',
      roomName: 'Slow French Practice',
      creatorId: 3,
      creatorName: '1 Minute in Slow French',
      title: '1 Minute in Slow French: Beginner A1-A2 Daily Stories',
      description: 'French podcast for beginners. Each episode: short story in slow, clear French. Topics: back to school, daily life, petanque, French culture.',
      durationSec: 60,
      fileUrl: 'https://open.spotify.com/embed/show/5UirSis56QYWZTOc5xxoBx?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 10 - Beginner French',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 5210,
      spotifyUrl: 'https://open.spotify.com/embed/show/5UirSis56QYWZTOc5xxoBx?utm_source=generator'
    },
    {
      id: 'podcast-fr-002',
      roomId: 'room-fr-002',
      roomName: 'French Culture & Conversation',
      creatorId: 4,
      creatorName: 'French Chit-Chat with Dylane',
      title: 'French Chit-Chat with Dylane: Paris Metro & French Culture (B1-B2)',
      description: 'Weekly slow French conversations on culture — Paris metro, Art Nouveau, French cheese (Camembert), 2024 Olympics. B1-B2 level. Free PDF transcripts.',
      durationSec: 600,
      fileUrl: 'https://open.spotify.com/embed/show/6ns2V3FI04vzYQv15KMDTd?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 26 - Intermediate French',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 4320,
      spotifyUrl: 'https://open.spotify.com/embed/show/6ns2V3FI04vzYQv15KMDTd?utm_source=generator'
    },

    // ── German: Slow German A1-B1 ──
    {
      id: 'podcast-de-001',
      roomId: 'room-de-001',
      roomName: 'Slow German A1-B1',
      creatorId: 6,
      creatorName: 'LearnGermanwithFalk',
      title: 'Slow German for Beginners (A1-B1): Alltag & Hochdeutsch',
      description: 'Slow German podcast for beginners by LearnGermanwithFalk. Daily life topics, clear accent-free Hochdeutsch. Episodes on Hamburg Port, Bosch, vocational training.',
      durationSec: 600,
      fileUrl: 'https://open.spotify.com/embed/show/6m5hXx0y9UTvrYVc93RAzR?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 20 - Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
      listenCount: 3490,
      spotifyUrl: 'https://open.spotify.com/embed/show/6m5hXx0y9UTvrYVc93RAzR?utm_source=generator'
    },
    {
      id: 'podcast-de-002',
      roomId: 'room-de-002',
      roomName: 'Slow German B1-B2',
      creatorId: 6,
      creatorName: 'Sloeful German',
      title: 'Slow German Podcast B1-B2: Berghain, Winter & German Culture',
      description: 'Intermediate German podcast (B1-B2) by Sloeful. Topics: Berlin nightlife (Berghain), German winters, cultural topics. Slow but natural speed. Free transcripts on sloeful.com.',
      durationSec: 900,
      fileUrl: 'https://open.spotify.com/embed/show/4eBoSBhDxUKaR0inaAtaR5?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=800&auto=format&fit=crop',
      language: 'DE',
      levelName: 'Level 35 - Upper Intermediate German',
      createdAt: new Date(Date.now() - 3600000 * 90).toISOString(),
      listenCount: 2180,
      spotifyUrl: 'https://open.spotify.com/embed/show/4eBoSBhDxUKaR0inaAtaR5?utm_source=generator'
    },

    // ── Korean: Talk To Me In Korean (TTMIK) ──
    {
      id: 'podcast-ko-001',
      roomId: 'room-ko-001',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean',
      title: 'Starting Korean Conversations: First Meetings & Greetings',
      description: 'TTMIK episode: how to start a conversation in Korean. Introductions, exchanging numbers, first meeting phrases. Native Korean with English explanation.',
      durationSec: 600,
      fileUrl: 'https://open.spotify.com/embed/episode/1u2BFbhkVgVxbkuFhCGGru?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 32 - Intermediate Korean',
      createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
      listenCount: 9290,
      spotifyUrl: 'https://open.spotify.com/embed/episode/1u2BFbhkVgVxbkuFhCGGru?utm_source=generator'
    },
    {
      id: 'podcast-ko-002',
      roomId: 'room-ko-002',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean',
      title: 'Level 1 Lesson 1: 안녕하세요. 감사합니다. | Korean Basics',
      description: 'TTMIK Level 1 Lesson 1: basic Korean greetings — 안녕하세요, 감사합니다, and essential first phrases for beginners.',
      durationSec: 360,
      fileUrl: 'https://open.spotify.com/embed/episode/4q5uQ5SQsYt7TocmBvdMRO?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 4 - Beginner Korean',
      createdAt: new Date(Date.now() - 3600000 * 100).toISOString(),
      listenCount: 7840,
      spotifyUrl: 'https://open.spotify.com/embed/episode/4q5uQ5SQsYt7TocmBvdMRO?utm_source=generator'
    },
    {
      id: 'podcast-ko-003',
      roomId: 'room-ko-003',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean',
      title: 'Level 2 Lesson 1: -ㄹ/을 거예요 | Future Tense in Korean',
      description: 'TTMIK Level 2 Lesson 1: future tense in Korean using -ㄹ/을 거예요. Expressing plans and predictions in natural Korean.',
      durationSec: 420,
      fileUrl: 'https://open.spotify.com/embed/episode/1T3QPTott4gLa9qYa1YWcf?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 16 - Pre-Intermediate Korean',
      createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
      listenCount: 5620,
      spotifyUrl: 'https://open.spotify.com/embed/episode/1T3QPTott4gLa9qYa1YWcf?utm_source=generator'
    },
    {
      id: 'podcast-ko-004',
      roomId: 'room-ko-004',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean',
      title: 'Real Life Korean: Exchanging Phone Numbers & Numbers 1-100',
      description: 'TTMIK real-life conversation: exchanging numbers in Korean. Covers Korean numbers 1-100 and natural phrases for giving your phone number.',
      durationSec: 480,
      fileUrl: 'https://open.spotify.com/embed/episode/4nUIzgZkSsbmzA35JdXE04?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 8 - Beginner Korean',
      createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
      listenCount: 4310,
      spotifyUrl: 'https://open.spotify.com/embed/episode/4nUIzgZkSsbmzA35JdXE04?utm_source=generator'
    }
  ];;

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