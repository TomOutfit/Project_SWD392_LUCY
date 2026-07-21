// src/controllers/sessionController.ts
import { db } from '../db/index.js';
import { studySessions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function getSessionHistory(req: any, res: any) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const sessions = await db.select().from(studySessions).orderBy(desc(studySessions.closedAt));

    // Filter sessions where this user participated (including as host)
    const userSessions = sessions
      .map(s => {
        try {
          const participants = JSON.parse(s.participantsJson);
          const isParticipant = participants.some((p: any) => p.oderId === userId);
          const participantRecord = participants.find((p: any) => p.oderId === userId);
          if (!isParticipant && s.hostId !== userId) return null;
          return {
            id: s.id,
            roomId: s.roomId,
            hostId: s.hostId,
            hostName: s.hostName,
            language: s.language,
            levelName: s.levelName,
            totalDurationSec: s.totalDurationSec,
            createdAt: s.createdAt,
            closedAt: s.closedAt,
            mySpeakingTimeSec: participantRecord?.activeSpeakingTimeSec ?? 0, // raw display time
            myValidatedTimeSec: participantRecord?.validatedSpeakingTimeSec ?? 0, // XP-validated time
            myXpEarned: participantRecord?.xpEarned ?? 0,
            totalParticipants: participants.length,
          };
        } catch {
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // Aggregate totals
    const totalXp = userSessions.reduce((sum, s) => sum + (s.myXpEarned ?? 0), 0);
    const totalSpeakingSec = userSessions.reduce((sum, s) => sum + (s.mySpeakingTimeSec ?? 0), 0);
    const totalValidatedSec = userSessions.reduce((sum, s) => sum + (s.myValidatedTimeSec ?? 0), 0);
    const totalSessions = userSessions.length;

    return res.json({ sessions: userSessions, totalXp, totalSpeakingSec, totalValidatedSec, totalSessions });
  } catch (err) {
    console.error('[sessionController] getSessionHistory error:', err);
    return res.status(500).json({ error: 'Failed to fetch session history' });
  }
}

export async function getStudyLeaderboard(req: any, res: any) {
  try {
    const sessions = await db.select().from(studySessions);

    // Aggregate XP per user across all sessions (as participant or host)
    const userMap = new Map<number, {
      userId: number;
      userName: string;
      totalXp: number;
      totalSpeakingSec: number;
      totalValidatedSec: number;
      totalSessions: number;
      totalDurationSec: number;
    }>();

    for (const session of sessions) {
      const hostEntry = userMap.get(session.hostId) ?? {
        userId: session.hostId,
        userName: session.hostName,
        totalXp: 0,
        totalSpeakingSec: 0,
        totalValidatedSec: 0,
        totalSessions: 0,
        totalDurationSec: 0,
      };
      hostEntry.totalSessions += 1;
      hostEntry.totalDurationSec += session.totalDurationSec;
      userMap.set(session.hostId, hostEntry);

      try {
        const participants = JSON.parse(session.participantsJson);
        for (const p of participants) {
          const entry = userMap.get(p.oderId) ?? {
            userId: p.oderId,
            userName: p.oderName,
            totalXp: 0,
            totalSpeakingSec: 0,
            totalValidatedSec: 0,
            totalSessions: 0,
            totalDurationSec: 0,
          };
          entry.totalXp += p.xpEarned ?? 0;
          entry.totalSpeakingSec += p.activeSpeakingTimeSec ?? 0;
          entry.totalValidatedSec += p.validatedSpeakingTimeSec ?? 0;
          userMap.set(p.oderId, entry);
        }
      } catch { /* ignore parse errors */ }
    }

    const ranking = Array.from(userMap.values())
      .map(u => ({
        userId: u.userId,
        displayName: u.userName,
        totalXp: u.totalXp,
        totalSpeakingSec: u.totalSpeakingSec,
        totalValidatedSec: u.totalValidatedSec,
        totalSessions: u.totalSessions,
        totalDurationSec: u.totalDurationSec,
      }))
      .sort((a, b) => b.totalXp - a.totalXp)
      .map((entry, idx) => ({ rank: idx + 1, ...entry }));

    return res.json(ranking);
  } catch (err) {
    console.error('[sessionController] getStudyLeaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

export async function getRecentSessions(req: any, res: any) {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '10'), 50);
    const sessions = await db
      .select()
      .from(studySessions)
      .orderBy(desc(studySessions.closedAt))
      .limit(limit);

    const formatted = sessions.map(s => {
      try {
        const participants = JSON.parse(s.participantsJson);
        const totalXp = participants.reduce((sum: number, p: any) => sum + (p.xpEarned ?? 0), 0);
        const topSpeaker = participants.reduce((best: any, p: any) =>
          (p.activeSpeakingTimeSec > (best?.activeSpeakingTimeSec ?? 0) ? p : best), null);
        return {
          id: s.id,
          roomId: s.roomId,
          hostId: s.hostId,
          hostName: s.hostName,
          language: s.language,
          levelName: s.levelName,
          totalDurationSec: s.totalDurationSec,
          participantCount: participants.length,
          totalXpEarned: totalXp,
          topSpeaker: topSpeaker ? { oderName: topSpeaker.oderName, activeSpeakingTimeSec: topSpeaker.activeSpeakingTimeSec } : null,
          closedAt: s.closedAt,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return res.json(formatted);
  } catch (err) {
    console.error('[sessionController] getRecentSessions error:', err);
    return res.status(500).json({ error: 'Failed to fetch recent sessions' });
  }
}
