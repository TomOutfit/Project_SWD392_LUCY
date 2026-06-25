// src/controllers/roomController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { rooms, podcasts } from '../db/schema.js';
import { eq, desc, and, asc } from 'drizzle-orm';

export async function getRooms(req: Request, res: Response) {
  try {
    const lang = req.query.lang as string | undefined;
    const allRooms = await db.select().from(rooms)
      .where(eq(rooms.isLive, true))
      .orderBy(desc(rooms.createdAt));

    let result = allRooms.map(r => ({
      id: r.id, name: r.name,
      hostId: r.hostId, hostName: r.hostName, hostPersonaId: r.hostPersonaId, hostRole: r.hostRole,
      language: r.language, levelId: r.levelId, levelName: r.levelName,
      isLive: r.isLive, state: r.state, currentSubLevel: r.currentSubLevel,
      participantCount: r.participantCount, createdAt: r.createdAt,
    }));

    if (lang) result = result.filter(r => r.language === lang.toUpperCase());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

export async function createRoom(req: Request, res: Response) {
  try {
    const { name, hostId, hostName, hostPersonaId, hostRole, language, levelId, levelName } = req.body;
    if (!name || !hostId || !language || !levelId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = {
      id: uuidv4(),
      name, hostId, hostName, hostPersonaId, hostRole,
      language: language.toUpperCase(), levelId, levelName,
      isLive: true, state: 'Active', currentSubLevel: 1,
      createdAt: new Date().toISOString(), participantCount: 1,
    };

    await db.insert(rooms).values(room);
    res.status(201).json({ ...room, participants: [], pinnedContent: null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
}

export async function getPodcasts(req: Request, res: Response) {
  try {
    const all = await db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
}

export async function getAgoraToken(req: Request, res: Response) {
  // In production, use agora-access-token package with real AppID/AppCertificate
  // For MVP, return a mock token
  const channelName = req.query.channelName as string;
  const uid = parseInt(req.query.uid as string) || Math.floor(Math.random() * 100000);
  const expireSec = 3600;

  const mockToken = Buffer.from(JSON.stringify({
    appId: 'MOCK_APP_ID',
    channelName,
    uid,
    expiresAt: Date.now() + expireSec * 1000,
    note: 'In production, use agora-access-token with real Agora credentials'
  })).toString('base64');

  res.json({
    token: mockToken,
    channelName,
    uid,
    expiresAt: Date.now() + expireSec * 1000,
  });
}
