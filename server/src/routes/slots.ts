import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../auth';
import { db, tx } from '../db';
import { asyncHandler, HttpError, parseBody } from '../http';
import { nowIso, uid } from '../utils';

export const slotsRouter = Router();

slotsRouter.get(
  '/my-slots',
  authRequired,
  asyncHandler((req, res) => {
    if (req.user!.role !== 'mentor') throw new HttpError(403, 'Раздел доступен только наставникам');

    const rows = db
      .prepare(
        `SELECT s.*, b.id AS booking_id, b.status AS booking_status,
                b.topic, lp.display_name AS learner_name
         FROM mentor_slots s
         LEFT JOIN bookings b ON b.slot_id = s.id
         LEFT JOIN profiles lp ON lp.id = b.learner_id
         WHERE s.mentor_id = ?
         ORDER BY s.starts_at DESC
         LIMIT 100`
      )
      .all(req.user!.id)
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id,
          starts_at: r.starts_at,
          ends_at: r.ends_at,
          status: r.status,
          booking: r.booking_id
            ? { id: r.booking_id, status: r.booking_status, topic: r.topic, learner_name: r.learner_name }
            : null,
        };
      });

    res.json(rows);
  })
);

const createSlotSchema = z.object({
  starts_at: z.string().datetime({ offset: true, message: 'Некорректная дата и время' }),
  duration_minutes: z.number().int().min(30).max(120).default(45),
});

slotsRouter.post(
  '/my-slots',
  authRequired,
  asyncHandler((req, res) => {
    if (req.user!.role !== 'mentor') throw new HttpError(403, 'Раздел доступен только наставникам');
    const data = parseBody(createSlotSchema, req.body);

    const start = new Date(data.starts_at);
    if (Number.isNaN(start.getTime())) throw new HttpError(400, 'Некорректная дата и время');
    if (start.getTime() < Date.now() + 10 * 60 * 1000) {
      throw new HttpError(400, 'Слот должен быть не раньше чем через 10 минут');
    }
    if (start.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
      throw new HttpError(400, 'Нельзя создавать слоты более чем на 90 дней вперёд');
    }

    const end = new Date(start.getTime() + data.duration_minutes * 60 * 1000);
    const id = uid();

    try {
      db.prepare(
        `INSERT INTO mentor_slots (id, mentor_id, starts_at, ends_at, status, created_at)
         VALUES (?, ?, ?, ?, 'available', ?)`
      ).run(id, req.user!.id, start.toISOString(), end.toISOString(), nowIso());
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new HttpError(409, 'Слот на это время уже существует');
      }
      throw error;
    }

    const slot = db.prepare('SELECT * FROM mentor_slots WHERE id = ?').get(id);
    res.status(201).json(slot);
  })
);

const bulkSlotSchema = z.object({
  slots: z
    .array(
      z.object({
        starts_at: z.string().datetime({ offset: true, message: 'Некорректная дата и время' }),
        duration_minutes: z.number().int().min(30).max(120).default(45),
      })
    )
    .min(1, 'Добавьте хотя бы один слот')
    .max(60, 'За один раз можно создать не более 60 слотов'),
});

slotsRouter.post(
  '/my-slots/bulk',
  authRequired,
  asyncHandler((req, res) => {
    if (req.user!.role !== 'mentor') throw new HttpError(403, 'Раздел доступен только наставникам');
    const data = parseBody(bulkSlotSchema, req.body);

    const created: string[] = [];
    const skipped: Array<{ starts_at: string; reason: string }> = [];
    const insert = db.prepare(
      `INSERT INTO mentor_slots (id, mentor_id, starts_at, ends_at, status, created_at)
       VALUES (?, ?, ?, ?, 'available', ?)`
    );

    tx(() => {
      for (const item of data.slots) {
        const start = new Date(item.starts_at);
        if (Number.isNaN(start.getTime())) {
          skipped.push({ starts_at: item.starts_at, reason: 'Некорректная дата и время' });
          continue;
        }
        if (start.getTime() < Date.now() + 10 * 60 * 1000) {
          skipped.push({ starts_at: item.starts_at, reason: 'Раньше чем через 10 минут' });
          continue;
        }
        if (start.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
          skipped.push({ starts_at: item.starts_at, reason: 'Позже 90 дней' });
          continue;
        }

        const end = new Date(start.getTime() + item.duration_minutes * 60 * 1000);
        const id = uid();
        try {
          insert.run(id, req.user!.id, start.toISOString(), end.toISOString(), nowIso());
          created.push(id);
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE')) {
            skipped.push({
              starts_at: item.starts_at,
              reason: 'Слот на это время уже существует',
            });
            continue;
          }
          throw error;
        }
      }
    });

    res.status(created.length > 0 ? 201 : 200).json({
      created: created.length,
      skipped: skipped.length,
      slots: created,
      skipped_details: skipped,
    });
  })
);

slotsRouter.delete(
  '/my-slots/:id',
  authRequired,
  asyncHandler((req, res) => {
    const slot = db.prepare('SELECT * FROM mentor_slots WHERE id = ?').get(req.params.id) as
      | { id: string; mentor_id: string; status: string }
      | undefined;
    if (!slot) throw new HttpError(404, 'Слот не найден');
    if (slot.mentor_id !== req.user!.id) throw new HttpError(403, 'Это не ваш слот');
    if (slot.status !== 'available') {
      throw new HttpError(409, 'Нельзя удалить слот, который уже забронирован');
    }
    db.prepare('DELETE FROM mentor_slots WHERE id = ?').run(slot.id);
    res.json({ ok: true });
  })
);
