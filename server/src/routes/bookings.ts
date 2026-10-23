import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../auth';
import { POINTS } from '../config';
import { db, tx } from '../db';
import { asyncHandler, HttpError, parseBody } from '../http';
import { notify, notifyAdmins } from '../notify';
import { checkAchievements, getUserStats, getEarned } from '../serialize';
import { nowIso, uid } from '../utils';
import type { BookingRow, SlotRow } from '../types';

export const bookingsRouter = Router();

interface BookingDetailRow {
  id: string;
  topic: string;
  note: string;
  status: BookingRow['status'];
  learner_confirmed_at: string | null;
  mentor_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  mentor_id: string;
  learner_id: string;
  slot_id: string;
  starts_at: string;
  ends_at: string;
  mentor_name: string;
  mentor_avatar: string | null;
  mentor_headline: string;
  mentor_city: string;
  mentor_is_demo: number;
  learner_name: string;
  learner_avatar: string | null;
  learner_city: string;
  review_id: string | null;
  review_rating: number | null;
  review_text: string | null;
  review_created_at: string | null;
}

const detailSelect = `
  SELECT b.*, s.starts_at, s.ends_at,
    mp.display_name AS mentor_name, mp.avatar_url AS mentor_avatar,
    mp.headline AS mentor_headline, mp.city AS mentor_city, mp.is_demo AS mentor_is_demo,
    lp.display_name AS learner_name, lp.avatar_url AS learner_avatar, lp.city AS learner_city,
    r.id AS review_id, r.rating AS review_rating, r.text AS review_text, r.created_at AS review_created_at
  FROM bookings b
  JOIN mentor_slots s ON s.id = b.slot_id
  JOIN profiles mp ON mp.id = b.mentor_id
  JOIN profiles lp ON lp.id = b.learner_id
  LEFT JOIN reviews r ON r.booking_id = b.id
`;

function mapBooking(row: BookingDetailRow, viewerId: string) {
  return {
    id: row.id,
    topic: row.topic,
    note: row.note,
    status: row.status,
    learner_confirmed_at: row.learner_confirmed_at,
    mentor_confirmed_at: row.mentor_confirmed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    viewer_role: row.mentor_id === viewerId ? 'mentor' : 'learner',
    slot: { id: row.slot_id, starts_at: row.starts_at, ends_at: row.ends_at },
    mentor: {
      id: row.mentor_id,
      display_name: row.mentor_name,
      avatar_url: row.mentor_avatar,
      headline: row.mentor_headline,
      city: row.mentor_city,
      is_demo: Boolean(row.mentor_is_demo),
    },
    learner: {
      id: row.learner_id,
      display_name: row.learner_name,
      avatar_url: row.learner_avatar,
      city: row.learner_city,
    },
    review:
      row.review_id !== null
        ? {
            id: row.review_id,
            rating: row.review_rating,
            text: row.review_text,
            created_at: row.review_created_at,
          }
        : null,
    can_review:
      row.status === 'completed' && row.learner_id === viewerId && row.review_id === null,
  };
}

function getBookingDetail(id: string, viewerId: string) {
  const row = db.prepare(`${detailSelect} WHERE b.id = ?`).get(id) as
    | BookingDetailRow
    | undefined;
  return row ? mapBooking(row, viewerId) : null;
}

function getBookingRaw(id: string): BookingRow | undefined {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined;
}

function requireParticipant(booking: BookingRow, userId: string) {
  if (booking.mentor_id !== userId && booking.learner_id !== userId) {
    throw new HttpError(403, 'Нет доступа к этой сессии');
  }
}

bookingsRouter.get(
  '/bookings',
  authRequired,
  asyncHandler((req, res) => {
    const scope = typeof req.query.scope === 'string' ? req.query.scope : 'all';
    const now = new Date().toISOString();

    let sql = `${detailSelect} WHERE (b.mentor_id = ? OR b.learner_id = ?)`;
    const params: string[] = [req.user!.id, req.user!.id];

    if (scope === 'upcoming') {
      sql += ` AND b.status IN ('pending', 'confirmed') AND s.starts_at >= ?`;
      params.push(now);
      sql += ` ORDER BY s.starts_at ASC`;
    } else if (scope === 'history') {
      sql += ` AND (b.status IN ('completed', 'cancelled', 'disputed') OR s.starts_at < ?)`;
      params.push(now);
      sql += ` ORDER BY s.starts_at DESC`;
    } else {
      sql += ` ORDER BY s.starts_at DESC`;
    }

    const rows = db.prepare(sql).all(...params) as unknown as BookingDetailRow[];
    res.json(rows.map((row) => mapBooking(row, req.user!.id)));
  })
);

const createSchema = z.object({
  mentor_id: z.string().uuid('Некорректный наставник'),
  slot_id: z.string().uuid('Некорректный слот'),
  topic: z.string().trim().min(5, 'Опишите тему консультации (минимум 5 символов)').max(200),
  note: z.string().trim().max(600).default(''),
});

bookingsRouter.post(
  '/bookings',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    if (me.role !== 'learner') {
      throw new HttpError(403, 'Бронировать сессии могут только ученики');
    }
    const data = parseBody(createSchema, req.body);

    const bookingId = uid();
    tx(() => {
      const slot = db.prepare('SELECT * FROM mentor_slots WHERE id = ?').get(data.slot_id) as
        | SlotRow
        | undefined;
      if (!slot) throw new HttpError(404, 'Слот не найден');
      if (slot.mentor_id !== data.mentor_id) throw new HttpError(400, 'Слот принадлежит другому наставнику');
      if (slot.status !== 'available') throw new HttpError(409, 'Это время уже занято');
      if (new Date(slot.starts_at).getTime() < Date.now()) {
        throw new HttpError(409, 'Нельзя записаться на прошедшее время');
      }
      if (data.mentor_id === me.id) throw new HttpError(400, 'Нельзя записаться к самому себе');

      const updated = db
        .prepare(`UPDATE mentor_slots SET status = 'booked' WHERE id = ? AND status = 'available'`)
        .run(slot.id);
      if (updated.changes === 0) throw new HttpError(409, 'Это время только что заняли');

      db.prepare(
        `INSERT INTO bookings
          (id, mentor_id, learner_id, slot_id, topic, note, status,
           learner_confirmed_at, mentor_confirmed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)`
      ).run(bookingId, data.mentor_id, me.id, slot.id, data.topic, data.note, nowIso(), nowIso());

      notify(data.mentor_id, {
        type: 'booking_created',
        title: 'Новая заявка на сессию',
        body: `${me.display_name}: ${data.topic}`,
        link: `/app/bookings/${bookingId}`,
      });
    });

    res.status(201).json(getBookingDetail(bookingId, me.id));
  })
);

bookingsRouter.patch(
  '/bookings/:id/confirm',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const booking = getBookingRaw(req.params.id);
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    if (booking.mentor_id !== me.id) {
      throw new HttpError(403, 'Подтверждать заявку может только наставник');
    }
    if (booking.status !== 'pending') {
      throw new HttpError(409, 'Заявка уже обработана');
    }

    tx(() => {
      db.prepare(`UPDATE bookings SET status = 'confirmed', updated_at = ? WHERE id = ?`).run(
        nowIso(),
        booking.id
      );

      notify(booking.learner_id, {
        type: 'booking_confirmed',
        title: 'Заявка подтверждена',
        body: `«${booking.topic}». Наставник подтвердил сессию.`,
        link: `/app/bookings/${booking.id}`,
      });
    });
    res.json(getBookingDetail(booking.id, me.id));
  })
);

bookingsRouter.post(
  '/bookings/:id/complete',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const booking = getBookingRaw(req.params.id);
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    requireParticipant(booking, me.id);
    if (booking.status === 'completed') {
      res.json({ booking: getBookingDetail(booking.id, me.id), awarded: false, points: 0 });
      return;
    }
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new HttpError(409, 'Эту сессию нельзя завершить в текущем статусе');
    }
    if (booking.status === 'pending') {
      throw new HttpError(409, 'Сначала наставник должен подтвердить заявку');
    }

    const isMentor = booking.mentor_id === me.id;
    const otherUserId = isMentor ? booking.learner_id : booking.mentor_id;
    const alreadyMarked = isMentor ? booking.mentor_confirmed_at : booking.learner_confirmed_at;
    let awarded = false;
    let points = 0;

    tx(() => {
      const field = isMentor ? 'mentor_confirmed_at' : 'learner_confirmed_at';
      db.prepare(
        `UPDATE bookings SET ${field} = COALESCE(${field}, ?), updated_at = ? WHERE id = ?`
      ).run(nowIso(), nowIso(), booking.id);

      const updated = getBookingRaw(booking.id)!;
      if (updated.learner_confirmed_at && updated.mentor_confirmed_at) {
        db.prepare(
          `UPDATE bookings SET status = 'completed', updated_at = ? WHERE id = ?`
        ).run(nowIso(), booking.id);
        db.prepare(`UPDATE mentor_slots SET status = 'completed' WHERE id = ?`).run(
          updated.slot_id
        );

        const award = db
          .prepare(
            `INSERT OR IGNORE INTO point_transactions
              (id, user_id, amount, transaction_type, reason, booking_id, mission_id,
               redemption_id, created_at)
             VALUES (?, ?, ?, 'session_reward', ?, ?, NULL, NULL, ?)`
          )
          .run(
            uid(),
            updated.mentor_id,
            POINTS.sessionReward,
            `Проведена подтверждённая сессия: ${updated.topic}`,
            updated.id,
            nowIso()
          );
        if (award.changes > 0) {
          awarded = true;
          points = POINTS.sessionReward;
        }

        notify(updated.mentor_id, {
          type: 'booking_completed',
          title: 'Сессия завершена',
          body: awarded
            ? `«${updated.topic}». Начислено ${POINTS.sessionReward} баллов.`
            : `«${updated.topic}».`,
          link: `/app/bookings/${updated.id}`,
        });
        notify(updated.learner_id, {
          type: 'booking_completed',
          title: 'Сессия завершена',
          body: `«${updated.topic}». Оставьте отзыв о наставнике.`,
          link: `/app/bookings/${updated.id}`,
        });
      } else if (!alreadyMarked) {
        // Одна сторона отметила завершение — вторая должна подтвердить.
        notify(otherUserId, {
          type: 'booking_completion_requested',
          title: 'Партнёр отметил завершение',
          body: `«${booking.topic}». Подтвердите, что встреча состоялась.`,
          link: `/app/bookings/${booking.id}`,
        });
      }
    });

    checkAchievements(booking.mentor_id);
    checkAchievements(booking.learner_id);

    res.json({ booking: getBookingDetail(booking.id, me.id), awarded, points });
  })
);

bookingsRouter.post(
  '/bookings/:id/cancel',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const booking = getBookingRaw(req.params.id);
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    requireParticipant(booking, me.id);
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new HttpError(409, 'Эту сессию нельзя отменить');
    }

    tx(() => {
      db.prepare(`UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(
        nowIso(),
        booking.id
      );
      const slot = db.prepare('SELECT * FROM mentor_slots WHERE id = ?').get(booking.slot_id) as
        | SlotRow
        | undefined;
      if (slot) {
        const future = new Date(slot.starts_at).getTime() > Date.now();
        db.prepare(`UPDATE mentor_slots SET status = ? WHERE id = ?`).run(
          future ? 'available' : 'cancelled',
          slot.id
        );
      }

      const otherUserId = me.id === booking.mentor_id ? booking.learner_id : booking.mentor_id;
      notify(otherUserId, {
        type: 'booking_cancelled',
        title: 'Сессия отменена',
        body: `${me.display_name} отменил(а) сессию «${booking.topic}».`,
        link: `/app/bookings/${booking.id}`,
      });
    });

    res.json(getBookingDetail(booking.id, me.id));
  })
);

bookingsRouter.post(
  '/bookings/:id/dispute',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const booking = getBookingRaw(req.params.id);
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    requireParticipant(booking, me.id);
    if (booking.status !== 'confirmed') {
      throw new HttpError(409, 'Спор можно открыть только по подтверждённой сессии');
    }
    tx(() => {
      db.prepare(`UPDATE bookings SET status = 'disputed', updated_at = ? WHERE id = ?`).run(
        nowIso(),
        booking.id
      );

      const otherUserId = me.id === booking.mentor_id ? booking.learner_id : booking.mentor_id;
      notify(otherUserId, {
        type: 'booking_disputed',
        title: 'Открыт спор по сессии',
        body: `«${booking.topic}». Администратор разберётся в ситуации.`,
        link: `/app/bookings/${booking.id}`,
      });
      notifyAdmins({
        type: 'dispute_created',
        title: 'Новый спор по сессии',
        body: `${me.display_name}: «${booking.topic}».`,
        link: '/app/admin',
      });
    });
    res.json(getBookingDetail(booking.id, me.id));
  })
);

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Поставьте оценку').max(5),
  text: z.string().trim().max(800).default(''),
});

bookingsRouter.post(
  '/bookings/:id/review',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const booking = getBookingRaw(req.params.id);
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    if (booking.learner_id !== me.id) throw new HttpError(403, 'Отзыв может оставить только ученик');
    if (booking.status !== 'completed') throw new HttpError(409, 'Отзыв доступен после завершения сессии');

    const data = parseBody(reviewSchema, req.body);
    try {
      tx(() => {
        db.prepare(
          `INSERT INTO reviews (id, booking_id, mentor_id, learner_id, rating, text, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(uid(), booking.id, booking.mentor_id, me.id, data.rating, data.text, nowIso());

        notify(booking.mentor_id, {
          type: 'review_received',
          title: 'Новый отзыв',
          body: `${me.display_name} оценил(а) сессию на ${data.rating} из 5.`,
          link: `/app/bookings/${booking.id}`,
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new HttpError(409, 'Отзыв уже оставлен');
      }
      throw error;
    }

    checkAchievements(booking.mentor_id);
    res.status(201).json(getBookingDetail(booking.id, me.id));
  })
);

/** Легкий endpoint для шапки: ближайшие сессии и статистика. */
bookingsRouter.get(
  '/bookings/summary',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const upcoming = db
      .prepare(
        `SELECT b.id, b.status, b.topic, s.starts_at, s.ends_at,
                CASE WHEN b.mentor_id = ? THEN lp.display_name ELSE mp.display_name END AS counterpart,
                CASE WHEN b.mentor_id = ? THEN 'learner' ELSE 'mentor' END AS direction
         FROM bookings b
         JOIN mentor_slots s ON s.id = b.slot_id
         JOIN profiles mp ON mp.id = b.mentor_id
         JOIN profiles lp ON lp.id = b.learner_id
         WHERE (b.mentor_id = ? OR b.learner_id = ?)
           AND b.status IN ('pending', 'confirmed')
           AND s.starts_at >= ?
         ORDER BY s.starts_at ASC
         LIMIT 5`
      )
      .all(me.id, me.id, me.id, me.id, new Date().toISOString());

    res.json({
      upcoming,
      stats: getUserStats(me.id),
      earned: getEarned(me.id),
    });
  })
);

/** Одна сессия по id — доступна только участникам. */
bookingsRouter.get(
  '/bookings/:id',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    const booking = getBookingRaw(req.params.id);
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    requireParticipant(booking, me.id);
    res.json(getBookingDetail(booking.id, me.id));
  })
);
