import { Router } from 'express';
import { authRequired } from '../auth';
import { db } from '../db';
import { asyncHandler } from '../http';
import { getBalance, getEarned } from '../serialize';
import { levelFor } from '../config';

export const pointsRouter = Router();

pointsRouter.get(
  '/points/balance',
  authRequired,
  asyncHandler((req, res) => {
    const balance = getBalance(req.user!.id);
    const earned = getEarned(req.user!.id);
    res.json({ balance, earned, level: levelFor(earned) });
  })
);

pointsRouter.get(
  '/points/transactions',
  authRequired,
  asyncHandler((req, res) => {
    const limitRaw = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 100;

    const rows = db
      .prepare(
        `SELECT t.*, m.title AS mission_title, b.topic AS booking_topic
         FROM point_transactions t
         LEFT JOIN missions m ON m.id = t.mission_id
         LEFT JOIN bookings b ON b.id = t.booking_id
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC
         LIMIT ?`
      )
      .all(req.user!.id, limit);
    res.json(rows);
  })
);
