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
    // ── English: Daily English Conversations (Spotify Playlist) ──
    {
      id: 'podcast-en-1',
      roomId: 'room-en-101',
      roomName: 'English Listening Practice',
      creatorId: 1,
      creatorName: 'Nguyen Van Quang',
      title: 'Daily English Conversation #1-50 | Real Listening Practice',
      description: 'Daily English conversation episodes on Spotify — real dialogues covering everyday topics. Perfect for intermediate learners building listening fluency.',
      durationSec: 720,
      fileUrl: 'https://open.spotify.com/embed/playlist/3dI0qKjcu0oMaUEAMMWDqV?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 14 - Pre-Intermediate',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      listenCount: 8420,
      spotifyUrl: 'https://open.spotify.com/embed/playlist/3dI0qKjcu0oMaUEAMMWDqV?utm_source=generator'
    },
    {
      id: 'podcast-en-2',
      roomId: 'room-en-102',
      roomName: 'Advanced English Mastery',
      creatorId: 2,
      creatorName: 'Oxford Online English',
      title: 'Speaking with Confidence: Advanced English Conversations',
      description: 'Advanced English podcast for learners aiming at C1/C2 proficiency. Natural speed, authentic vocabulary.',
      durationSec: 1200,
      fileUrl: 'https://open.spotify.com/embed/show/4R79l1KvnZnY5BcBQ2YB9q?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
      language: 'EN',
      levelName: 'Level 30 - Advanced English',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 6150,
      spotifyUrl: 'https://open.spotify.com/embed/show/4R79l1KvnZnY5BcBQ2YB9q?utm_source=generator'
    },

    // ── Japanese: Luyen Nghe Tieng Nhat Qua Anime (Spotify Show) ──
    {
      id: 'podcast-ja-1',
      roomId: 'room-ja-202',
      roomName: 'Japanese Through Anime',
      creatorId: 7,
      creatorName: 'Lucid Dream',
      title: 'Luyen Nghe Tieng Nhat Qua Anime | Learn Japanese with Studio Ghibli & More',
      description: 'Learn Japanese passively through famous anime — Howl Moving Castle, Ponyo, My Neighbor Totoro, Arrietty. Native Japanese audio with Vietnamese context.',
      durationSec: 2400,
      fileUrl: 'https://open.spotify.com/embed/show/18G7IWPHXatk493YkUHLA1?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1528164344705-47542687990d?q=80&w=800&auto=format&fit=crop',
      language: 'JA',
      levelName: 'Level 38 - Beginner Japanese',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      listenCount: 7890,
      spotifyUrl: 'https://open.spotify.com/embed/show/18G7IWPHXatk493YkUHLA1?utm_source=generator'
    },

    // ── Chinese: Luyen Nghe Tieng Trung | An Vu (Spotify Show) ──
    {
      id: 'podcast-zh-1',
      roomId: 'room-zh-303',
      roomName: 'Mandarin Listening Hub',
      creatorId: 10,
      creatorName: 'An Vu',
      title: 'Luyen Nghe Tieng Trung | An Vu — HSK4-5 Daily Conversations',
      description: 'Mandarin Chinese listening podcast by An Vu. Daily conversations at HSK4-5 level. Topics: relationships, life stories, cultural insights. 5-8 min per episode.',
      durationSec: 300,
      fileUrl: 'https://open.spotify.com/embed/show/0yKVlqvezr9ay0GK8JP9QP?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      language: 'ZH',
      levelName: 'Level 55 - Advanced Chinese',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      listenCount: 4812,
      spotifyUrl: 'https://open.spotify.com/embed/show/0yKVlqvezr9ay0GK8JP9QP?utm_source=generator'
    },

    // ── Spanish: Let's Talk Spanish + Intermediate Spanish Stories ──
    {
      id: 'podcast-es-1',
      roomId: 'room-es-401',
      roomName: 'Madrid Spanish Club',
      creatorId: 5,
      creatorName: "Let's Talk Spanish",
      title: "Let's Talk Spanish: Intermediate Conversations & Real Spain Topics",
      description: "Real Spanish conversations by native speakers. Topics: travel, culture, Costa Rica, Bolivia. Designed for intermediate learners.",
      durationSec: 1200,
      fileUrl: 'https://open.spotify.com/embed/show/4VgvysJMdU2goUaj8mOm90?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1513740051206-8d63a48e6522?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 22 - Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      listenCount: 3950,
      spotifyUrl: 'https://open.spotify.com/embed/show/4VgvysJMdU2goUaj8mOm90?utm_source=generator'
    },
    {
      id: 'podcast-es-2',
      roomId: 'room-es-402',
      roomName: 'Latin American Conversations',
      creatorId: 5,
      creatorName: 'Intermediate Spanish Stories',
      title: 'Intermediate Spanish Stories: Slow-Paced A2-C2 Listening Practice',
      description: 'Spanish stories at a slower pace. Mexican Spanish, Argentine Spanish, free transcripts available.',
      durationSec: 900,
      fileUrl: 'https://open.spotify.com/embed/show/297icBGyHypekB2qt5Y9CM?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=800&auto=format&fit=crop',
      language: 'ES',
      levelName: 'Level 35 - Upper Intermediate Spanish',
      createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
      listenCount: 3420,
      spotifyUrl: 'https://open.spotify.com/embed/show/297icBGyHypekB2qt5Y9CM?utm_source=generator'
    },

    // ── French: 1 Minute in Slow French + French Chit-Chat ──
    {
      id: 'podcast-fr-1',
      roomId: 'room-fr-501',
      roomName: 'Slow French Practice',
      creatorId: 3,
      creatorName: '1 Minute in Slow French',
      title: '1 Minute in Slow French: Beginner A1-A2 Daily Stories',
      description: 'French podcast for beginners. Each episode: short story in slow, clear French. Topics: back to school, daily life, petanque, French culture. Victoria Vernhes (certified teacher).',
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
      id: 'podcast-fr-2',
      roomId: 'room-fr-502',
      roomName: 'French Culture & Conversation',
      creatorId: 4,
      creatorName: 'French Chit-Chat with Dylane',
      title: 'French Chit-Chat with Dylane: B1-B2 Slow Conversations Weekly',
      description: 'Weekly slow French conversations on culture, Paris, Camembert cheese, French idioms. Perfect for B1-B2 learners. Free PDF transcripts available.',
      durationSec: 600,
      fileUrl: 'https://open.spotify.com/embed/show/6ns2V3FI04vzYQv15KMDTd?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
      language: 'FR',
      levelName: 'Level 26 - Intermediate French',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      listenCount: 4320,
      spotifyUrl: 'https://open.spotify.com/embed/show/6ns2V3FI04vzYQv15KMDTd?utm_source=generator'
    },

    // ── German: Slow German A1-B1 + B1-B2 ──
    {
      id: 'podcast-de-1',
      roomId: 'room-de-601',
      roomName: 'Slow German A1-B1',
      creatorId: 6,
      creatorName: 'LearnGermanwithFalk',
      title: 'Slow German for Beginners (A1-B1): Alltag & Hochdeutsch',
      description: 'Slow German podcast for beginners by Falk. Daily life topics, clear accent-free Hochdeutsch. Transcripts on Patreon. Beginner-friendly A1-B1 level.',
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
      id: 'podcast-de-2',
      roomId: 'room-de-602',
      roomName: 'Slow German B1-B2',
      creatorId: 6,
      creatorName: 'Sloeful German',
      title: 'Slow German Podcast B1-B2: Berghain, Winter & German Culture',
      description: 'Intermediate German podcast (B1-B2) by Sloeful. Topics: Berlin nightlife, German winters, cultural topics. Slow but natural speed. Free transcripts on sloeful.com.',
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
      id: 'podcast-ko-1',
      roomId: 'room-ko-701',
      roomName: 'Seoul Speaking Lounge',
      creatorId: 9,
      creatorName: 'TalkToMeInKorean',
      title: 'Talk To Me In Korean (TTMIK): Real Conversations & Natural Slang',
      description: "The world's most popular Korean learning podcast. Native Korean hosts discuss idioms, slang, and culture. Perfect for building natural conversation ability.",
      durationSec: 600,
      fileUrl: 'https://open.spotify.com/embed/show/0f007dsSQtyGB1aOPNXdLt?utm_source=generator',
      coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800&auto=format&fit=crop',
      language: 'KO',
      levelName: 'Level 32 - Intermediate Korean',
      createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
      listenCount: 9290,
      spotifyUrl: 'https://open.spotify.com/embed/show/0f007dsSQtyGB1aOPNXdLt?utm_source=generator'
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