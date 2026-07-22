// src/controllers/roomController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { rooms, podcasts } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;

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

export async function getPodcasts(req: Request, res: Response) {
  try {
    const all = await db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
}

export async function getAgoraToken(req: Request, res: Response) {
  try {
    const channelName = (req.query.channelName as string | undefined) || 'default';
    const uid = parseInt((req.query.uid as string | undefined) || '0', 10) || 0;
    const expireSec = parseInt((req.query.expireSec as string | undefined) || '3600', 10) || 3600;

    const appId = process.env.AGORA_APP_ID;
    const appCredential = process.env.AGORA_APP_CREDENTIAL;

    if (!appId || !appCredential) {
      return res.status(500).json({ error: 'Agora credentials not configured' });
    }

    console.log('[AgoraToken] Generating token with App ID:', appId, 'channel:', channelName, 'uid:', uid);

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCredential,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireSec,
      expireSec,
    );

    res.json({
      token,
      channelName,
      uid,
      expiresAt: (Math.floor(Date.now() / 1000) + expireSec) * 1000,
    });
  } catch (err) {
    console.error('[AgoraToken] Failed to build token:', err);
    res.status(500).json({ error: 'Failed to generate Agora token' });
  }
}
