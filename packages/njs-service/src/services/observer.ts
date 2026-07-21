// src/services/observer.ts
import { Server } from 'socket.io';
import db from '../db/index.js';
import { rooms } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { Room, ContentPin } from '../types/index.js';
import { levels } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export interface Observer {
  update(event: string, data: any): void | Promise<void>;
}

export interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(event: string, data: any): void | Promise<void>;
}

// Subject for managing room stage transitions
export class RoomStageSubject implements Subject {
  private observers: Observer[] = [];
  private roomId: string;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  attach(observer: Observer): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  detach(observer: Observer): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  notify(event: string, data: any): void {
    for (const observer of this.observers) {
      Promise.resolve(observer.update(event, data)).catch(err => {
        console.error(`[Observer Error] Failed to update observer:`, err);
      });
    }
  }

  async transitionToNextSubLevel(room: Room): Promise<void> {
    if (room.currentSubLevel < 12) {
      room.currentSubLevel++;
      room.state = 'Transition' as any;

      // Reset accumulated speaking metrics for the new sub-level
      room.activeSpeakingTimeSec = 0;

      // Reset per-participant active speaking counters
      for (const p of room.participants) {
        p.activeSpeakingTimeSec = 0;
      }

      // Notify observers that transition has started
      this.notify('stage-changed', { roomId: this.roomId, room });

      // After 3 seconds, resume to Active
      setTimeout(() => {
        room.state = 'Active' as any;
        this.notify('room-updated', { roomId: this.roomId, room });
      }, 3000);
    }
  }
}

// Concrete Observer 1: Emit real-time events to connected socket clients
export class SocketNotifierObserver implements Observer {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  update(event: string, data: { roomId: string; room: Room }): void {
    const { roomId, room } = data;
    if (event === 'stage-changed') {
      this.io.to(roomId).emit('stage-changed', {
        roomId,
        newSubLevel: room.currentSubLevel,
        levelName: room.levelName,
      });
      this.io.to(roomId).emit('room-updated', { room });
    } else if (event === 'room-updated') {
      this.io.to(roomId).emit('room-updated', { room });
    }
  }
}

// Concrete Observer 2: Persist state changes in SQLite using Drizzle
export class DbPersistenceObserver implements Observer {
  async update(event: string, data: { roomId: string; room: Room }): Promise<void> {
    const { roomId, room } = data;
    if (event === 'stage-changed' || event === 'room-updated') {
      try {
        await db.update(rooms)
          .set({
            currentSubLevel: room.currentSubLevel,
            state: room.state,
          })
          .where(eq(rooms.id, roomId));
        console.log(`[DbPersistenceObserver] Persisted room ${roomId} - State: ${room.state}, Sub-level: ${room.currentSubLevel}`);
      } catch (err) {
        console.error(`[DbPersistenceObserver] Failed to update SQLite for room ${roomId}:`, err);
      }
    }
  }
}

// Concrete Observer 3: Suggest & Auto-pin new learning materials from database
export class MaterialRecommenderObserver implements Observer {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async update(event: string, data: { roomId: string; room: Room }): Promise<void> {
    const { roomId, room } = data;
    if (event === 'stage-changed') {
      try {
        // Query the starter level to get language and stage
        const [startLevel] = await db.select().from(levels).where(eq(levels.id, room.levelId));
        if (!startLevel) return;

        const lang = startLevel.language;
        const stage = startLevel.stage;
        const subLevel = room.currentSubLevel;

        // Query level content for current subLevel
        const [nextLevel] = await db.select()
          .from(levels)
          .where(and(
            eq(levels.language, lang),
            eq(levels.stage, stage),
            eq(levels.subLevel, subLevel)
          ));

        if (nextLevel) {
          const content = JSON.parse(nextLevel.contentJson);
          console.log(`[MaterialRecommenderObserver] Level ${nextLevel.id} content:`, content);

          // Auto-pin new vocabulary list
          const pin: ContentPin = {
            id: uuidv4(),
            title: `Vocabulary for Sub-level ${subLevel}`,
            url: `Vocab: ${content.vocabulary.join(', ')}`,
            type: 'vocabulary',
            pinnedBy: room.hostId,
            pinnedAt: new Date().toISOString(),
          };

          room.pinnedContent = pin;

          // Emit updates to clients
          this.io.to(roomId).emit('pinned-content-updated', { roomId, pin });
          this.io.to(roomId).emit('ai-recommendation-updated', {
            roomId,
            recommendation: {
              vocabulary: content.vocabulary,
              conversationPrompts: content.conversationPrompts,
              grammarTips: content.grammarTips,
              aiSuggestedQuestions: content.aiSuggestedQuestions,
              levelName: nextLevel.name,
              levelId: nextLevel.id,
            }
          });
        }
      } catch (err) {
        console.error(`[MaterialRecommenderObserver] Failed to load level recommendations:`, err);
      }
    }
  }
}
