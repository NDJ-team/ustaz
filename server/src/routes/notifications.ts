import { Router } from 'express';
import { authRequired } from '../auth';
import { db } from '../db';
import { asyncHandler, HttpError } from '../http';

export const notificationsRouter = Router();

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

notificationsRouter.get(
  '/notifications',
  authRequired,
  asyncHandler((req, res) => {
    const raw = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(raw) ? Math.min(100, Math.max(1, Math.floor(raw))) : 50;

    const rows = db
      .prepare(
        `SELECT id, type, title, body, link, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(req.user!.id, limit) as unknown as NotificationRow[];

    const unread = db
      .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`)
      .get(req.user!.id) as { c: number };

    res.json({
      unread: Number(unread.c),
      items: rows.map((row) => ({ ...row, is_read: Boolean(row.is_read) })),
    });
  })
);

notificationsRouter.patch(
  '/notifications/read-all',
  authRequired,
  asyncHandler((req, res) => {
    const result = db
      .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`)
      .run(req.user!.id);
    res.json({ ok: true, updated: Number(result.changes) });
  })
);

notificationsRouter.patch(
  '/notifications/:id/read',
  authRequired,
  asyncHandler((req, res) => {
    const result = db
      .prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`)
      .run(req.params.id, req.user!.id);

    if (Number(result.changes) === 0) {
      // Не раскрываем, существует ли чужое уведомление.
      throw new HttpError(404, 'Уведомление не найдено');
    }
    res.json({ ok: true });
  })
);
