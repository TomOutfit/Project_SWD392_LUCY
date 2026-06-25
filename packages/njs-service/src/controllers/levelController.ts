// src/controllers/levelController.ts
import { Request, Response } from 'express';
import db from '../db/index.js';
import { levels } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export async function getAllLevels(req: Request, res: Response) {
  try {
    const allLevels = await db.select().from(levels).orderBy(asc(levels.id));
    const result = allLevels.map(row => ({
      id: row.id,
      name: row.name,
      language: row.language,
      stage: row.stage,
      subLevel: row.subLevel,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
}

export async function getLevelById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(levels).where(eq(levels.id, id));
    if (!row) return res.status(404).json({ error: 'Level not found' });

    res.json({
      id: row.id,
      name: row.name,
      language: row.language,
      stage: row.stage,
      subLevel: row.subLevel,
      content: JSON.parse(row.contentJson),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch level' });
  }
}

export async function getLevelsByLanguage(req: Request, res: Response) {
  try {
    const lang = req.params.lang.toUpperCase();
    const allLevels = await db.select().from(levels).where(eq(levels.language, lang)).orderBy(asc(levels.id));
    const result = allLevels.map(row => ({
      id: row.id,
      name: row.name,
      language: row.language,
      stage: row.stage,
      subLevel: row.subLevel,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
}
