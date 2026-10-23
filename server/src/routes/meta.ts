import { Router } from 'express';
import { CATEGORIES, LEVELS, PLATFORM, POINTS } from '../config';
import { db } from '../db';

export const metaRouter = Router();

metaRouter.get('/meta', (_req, res) => {
  const cities = db
    .prepare(
      `SELECT DISTINCT city FROM profiles WHERE city <> '' AND is_blocked = 0 ORDER BY city ASC`
    )
    .all()
    .map((row) => (row as { city: string }).city);

  res.json({
    platform: PLATFORM,
    points: POINTS,
    levels: LEVELS,
    categories: CATEGORIES,
    cities,
  });
});
