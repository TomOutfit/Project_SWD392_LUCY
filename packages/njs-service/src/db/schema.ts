// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const levels = sqliteTable('levels', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  language: text('language').notNull(), // EN, ZH, JA
  stage: integer('stage').notNull(),   // 1, 2, 3
  subLevel: integer('sub_level').notNull(), // 1-12
  contentJson: text('content_json').notNull(),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hostId: integer('host_id').notNull(),
  hostName: text('host_name').notNull(),
  hostPersonaId: integer('host_persona_id').notNull(),
  hostRole: text('host_role').notNull(),
  language: text('language').notNull(),
  levelId: integer('level_id').notNull(),
  levelName: text('level_name').notNull(),
  isLive: integer('is_live', { mode: 'boolean' }).notNull().default(true),
  state: text('state').notNull().default('Lobby'),
  currentSubLevel: integer('current_sub_level').notNull().default(1),
  createdAt: text('created_at').notNull(),
  participantCount: integer('participant_count').notNull().default(0),
});

export const podcasts = sqliteTable('podcasts', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  roomName: text('room_name').notNull(),
  creatorId: integer('creator_id').notNull(),
  creatorName: text('creator_name').notNull(),
  title: text('title').notNull(),
  durationSec: integer('duration_sec').notNull(),
  fileUrl: text('file_url').notNull(),
  coverUrl: text('cover_url'),
  language: text('language').notNull(),
  levelName: text('level_name').notNull(),
  createdAt: text('created_at').notNull(),
  listenCount: integer('listen_count').notNull().default(0),
});

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  hostId: integer('host_id').notNull(),
  hostName: text('host_name').notNull(),
  language: text('language').notNull(),
  levelName: text('level_name').notNull(),
  participantsJson: text('participants_json').notNull(), // JSON: [{userId, userName, oderRole, activeSpeakingTimeSec, xpEarned}]
  totalDurationSec: integer('total_duration_sec').notNull(),
  createdAt: text('created_at').notNull(),
  closedAt: text('closed_at').notNull(),
});

export type LevelRow = typeof levels.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type PodcastRow = typeof podcasts.$inferSelect;
export type StudySessionRow = typeof studySessions.$inferSelect;
