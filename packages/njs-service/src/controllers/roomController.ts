// src/controllers/roomController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { rooms, podcasts } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import agora from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = agora;

const AGORA_APP_ID = process.env.AGORA_APP_ID as string | undefined;
const AGORA_APP_CREDENTIAL = process.env.AGORA_APP_CREDENTIAL as string | undefined;

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

    if (!AGORA_APP_ID || !AGORA_APP_CREDENTIAL) {
      return res.status(500).json({ error: 'Agora App ID / App Credential not configured on server' });
    }

    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expireSec;
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CREDENTIAL,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
    );

    res.json({
      token,
      channelName,
      uid,
      expiresAt: privilegeExpiredTs * 1000,
    });
  } catch (err) {
    console.error('[AgoraToken] Failed to build token:', err);
    res.status(500).json({ error: 'Failed to generate Agora token' });
  }
}
