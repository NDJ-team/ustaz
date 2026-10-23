import { Router } from 'express';
import { z } from 'zod';
import { adminRequired } from '../auth';
import { POINTS } from '../config';
import { db, tx } from '../db';
import { asyncHandler, HttpError, parseBody } from '../http';
import { checkAchievements, publicProfile } from '../serialize';
import { nowIso, uid } from '../utils';
import type { ProfileRow, BookingRow, SlotRow } from '../types';

export const adminRouter = Router();
adminRouter.use(adminRequired);

function audit(
  adminId: string,
  action: string,
  entity: string,
  entityId: string | null,
  details: string
) {
  db.prepare(
    `INSERT INTO admin_audit (id, admin_id, action, entity, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uid(), adminId, action, entity, entityId, details, nowIso());
}

adminRouter.get(
  '/admin/overview',
  asyncHandler((req, res) => {
    const count = (sql: string, ...params: string[]) =>
      Number((db.prepare(sql).get(...params) as { c: number }).c);

    res.json({
      users: count('SELECT COUNT(*) AS c FROM profiles'),
      mentors: count(`SELECT COUNT(*) AS c FROM profiles WHERE role = 'mentor'`),
      learners: count(`SELECT COUNT(*) AS c FROM profiles WHERE role = 'learner'`),
      bookings: count('SELECT COUNT(*) AS c FROM bookings'),
      pending_bookings: count(`SELECT COUNT(*) AS c FROM bookings WHERE status = 'pending'`),
      disputed_bookings: count(`SELECT COUNT(*) AS c FROM bookings WHERE status = 'disputed'`),
      missions_to_review: count(
        `SELECT COUNT(*) AS c FROM mission_participants WHERE status = 'submitted'`
      ),
      redemptions: count('SELECT COUNT(*) AS c FROM reward_redemptions'),
      points_issued: Number(
        (
          db
            .prepare('SELECT COALESCE(SUM(amount), 0) AS c FROM point_transactions WHERE amount > 0')
            .get() as { c: number }
        ).c
      ),
      points_spent: Number(
        (
          db
            .prepare('SELECT COALESCE(-SUM(amount), 0) AS c FROM point_transactions WHERE amount < 0')
            .get() as { c: number }
        ).c
      ),
    });
  })
);

adminRouter.get(
  '/admin/users',
  asyncHandler((req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let sql = `
      SELECT p.*,
        (SELECT COALESCE(SUM(t.amount), 0) FROM point_transactions t WHERE t.user_id = p.id) AS balance,
        (SELECT COUNT(*) FROM bookings b WHERE b.mentor_id = p.id AND b.status = 'completed') AS sessions
      FROM profiles p
      WHERE 1 = 1`;
    const params: string[] = [];
    if (q) {
      sql += ' AND (p.display_name LIKE ? OR p.email LIKE ? OR p.city LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    sql += ' ORDER BY p.created_at DESC LIMIT 200';

    const rows = db.prepare(sql).all(...params) as unknown as Array<
      ProfileRow & { balance: number; sessions: number }
    >;
    res.json(
      rows.map((row) => ({
        ...publicProfile(row, true),
        balance: Number(row.balance),
        sessions: Number(row.sessions),
      }))
    );
  })
);

const blockSchema = z.object({ blocked: z.boolean() });

adminRouter.patch(
  '/admin/users/:id/block',
  asyncHandler((req, res) => {
    const data = parseBody(blockSchema, req.body);
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id) as
      | ProfileRow
      | undefined;
    if (!user) throw new HttpError(404, 'Пользователь не найден');
    if (user.role === 'admin') throw new HttpError(400, 'Нельзя заблокировать администратора');

    let cancelledBookings = 0;
    let freedSlots = 0;
    let closedMissionApplications = 0;

    tx(() => {
      db.prepare('UPDATE profiles SET is_blocked = ? WHERE id = ?').run(
        data.blocked ? 1 : 0,
        user.id
      );

      // Блокировка должна гасить активные обязательства пользователя,
      // иначе слоты остаются занятыми, а заявки — висеть в очереди на проверку.
      if (data.blocked) {
        const activeBookings = db
          .prepare(
            `SELECT id, slot_id FROM bookings
             WHERE status IN ('pending', 'confirmed')
               AND (mentor_id = ? OR learner_id = ?)`
          )
          .all(user.id, user.id) as Array<{ id: string; slot_id: string }>;

        for (const booking of activeBookings) {
          db.prepare(`UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(
            nowIso(),
            booking.id
          );
          const slot = db
            .prepare('SELECT starts_at FROM mentor_slots WHERE id = ?')
            .get(booking.slot_id) as { starts_at: string } | undefined;
          if (slot) {
            const future = new Date(slot.starts_at).getTime() > Date.now();
            const freed = db
              .prepare(`UPDATE mentor_slots SET status = ? WHERE id = ? AND status = 'booked'`)
              .run(future ? 'available' : 'cancelled', booking.slot_id);
            if (Number(freed.changes) > 0 && future) freedSlots += 1;
          }
        }
        cancelledBookings = activeBookings.length;

        // Наставник, ушедший в блокировку, не должен получать новые заявки.
        if (user.role === 'mentor') {
          freedSlots += Number(
            db
              .prepare(
                `UPDATE mentor_slots SET status = 'cancelled'
               WHERE mentor_id = ? AND status = 'available'`
              )
              .run(user.id).changes
          );
        }

        // Незакрытые заявки на миссии больше не могут быть проверены.
        closedMissionApplications = Number(
          db
            .prepare(
              `UPDATE mission_participants
             SET status = 'rejected', review_note = ?, updated_at = ?
             WHERE user_id = ? AND status IN ('joined', 'submitted')`
            )
            .run('Участник заблокирован администратором', nowIso(), user.id).changes
        );
      }

      const details = [
        `${user.display_name} (${user.email})`,
        cancelledBookings ? `отменено сессий: ${cancelledBookings}` : '',
        freedSlots ? `освобождено слотов: ${freedSlots}` : '',
        closedMissionApplications ? `закрыто заявок на миссии: ${closedMissionApplications}` : '',
      ]
        .filter(Boolean)
        .join('; ');

      audit(
        req.user!.id,
        data.blocked ? 'user_blocked' : 'user_unblocked',
        'profile',
        user.id,
        details
      );
    });

    res.json({ ok: true, blocked: data.blocked, cancelledBookings, freedSlots, closedMissionApplications });
  })
);

adminRouter.get(
  '/admin/bookings',
  asyncHandler((req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    let sql = `
      SELECT b.*, s.starts_at, s.ends_at,
             mp.display_name AS mentor_name, lp.display_name AS learner_name
      FROM bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN profiles mp ON mp.id = b.mentor_id
      JOIN profiles lp ON lp.id = b.learner_id`;
    const params: string[] = [];
    if (status && ['pending', 'confirmed', 'completed', 'cancelled', 'disputed'].includes(status)) {
      sql += ' WHERE b.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY b.created_at DESC LIMIT 300';

    res.json(db.prepare(sql).all(...params));
  })
);

const resolveBookingSchema = z.object({
  action: z.enum(['complete', 'cancel']),
  note: z.string().trim().max(500).default(''),
});

adminRouter.patch(
  '/admin/bookings/:id/resolve',
  asyncHandler((req, res) => {
    const admin = req.user!;
    const data = parseBody(resolveBookingSchema, req.body);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as
      | BookingRow
      | undefined;
    if (!booking) throw new HttpError(404, 'Бронирование не найдено');
    if (booking.status !== 'disputed') {
      throw new HttpError(409, 'Разрешать можно только спорные бронирования');
    }

    let awarded = false;
    tx(() => {
      if (data.action === 'complete') {
        db.prepare(
          `UPDATE bookings SET status = 'completed',
             learner_confirmed_at = COALESCE(learner_confirmed_at, ?),
             mentor_confirmed_at = COALESCE(mentor_confirmed_at, ?),
             updated_at = ?
           WHERE id = ?`
        ).run(nowIso(), nowIso(), nowIso(), booking.id);
        db.prepare(`UPDATE mentor_slots SET status = 'completed' WHERE id = ?`).run(booking.slot_id);

        const award = db
          .prepare(
            `INSERT OR IGNORE INTO point_transactions
              (id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at)
             VALUES (?, ?, ?, 'session_reward', ?, ?, NULL, NULL, ?)`
          )
          .run(
            uid(),
            booking.mentor_id,
            POINTS.sessionReward,
            `Спор разрешён в пользу наставника: ${booking.topic}`,
            booking.id,
            nowIso()
          );
        awarded = award.changes > 0;
      } else {
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
      }

      audit(
        admin.id,
        data.action === 'complete' ? 'booking_completed' : 'booking_cancelled',
        'booking',
        booking.id,
        data.note || 'Решение администратора по спору'
      );
    });

    checkAchievements(booking.mentor_id);
    res.json({ ok: true, awarded });
  })
);

adminRouter.get(
  '/admin/transactions',
  asyncHandler((_req, res) => {
    const rows = db
      .prepare(
        `SELECT t.*, u.display_name AS user_name, u.email AS user_email,
                b.topic AS booking_topic, m.title AS mission_title, r.title AS reward_title
         FROM point_transactions t
         JOIN profiles u ON u.id = t.user_id
         LEFT JOIN bookings b ON b.id = t.booking_id
         LEFT JOIN missions m ON m.id = t.mission_id
         LEFT JOIN rewards r ON r.id = (SELECT reward_id FROM reward_redemptions WHERE id = t.redemption_id)
         ORDER BY t.created_at DESC LIMIT 300`
      )
      .all();
    res.json(rows);
  })
);

adminRouter.get(
  '/admin/redemptions',
  asyncHandler((_req, res) => {
    const rows = db
      .prepare(
        `SELECT rr.*, u.display_name AS user_name, u.email AS user_email,
                r.title AS reward_title, r.partner_name
         FROM reward_redemptions rr
         JOIN profiles u ON u.id = rr.user_id
         JOIN rewards r ON r.id = rr.reward_id
         ORDER BY rr.created_at DESC LIMIT 300`
      )
      .all();
    res.json(rows);
  })
);

adminRouter.get(
  '/admin/audit',
  asyncHandler((_req, res) => {
    const rows = db
      .prepare(
        `SELECT a.*, u.display_name AS admin_name
         FROM admin_audit a
         JOIN profiles u ON u.id = a.admin_id
         ORDER BY a.created_at DESC LIMIT 200`
      )
      .all();
    res.json(rows);
  })
);

adminRouter.get(
  '/admin/reviews',
  asyncHandler((_req, res) => {
    const rows = db
      .prepare(
        `SELECT r.*, mp.display_name AS mentor_name, lp.display_name AS learner_name
         FROM reviews r
         JOIN profiles mp ON mp.id = r.mentor_id
         JOIN profiles lp ON lp.id = r.learner_id
         ORDER BY r.created_at DESC LIMIT 200`
      )
      .all();
    res.json(rows);
  })
);
