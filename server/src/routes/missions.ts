import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../auth';
import { db, tx } from '../db';
import { asyncHandler, HttpError, parseBody } from '../http';
import { notify, notifyAdmins } from '../notify';
import { checkAchievements } from '../serialize';
import { nowIso, uid } from '../utils';

export const missionsRouter = Router();

interface MissionListRow {
  id: string;
  title: string;
  description: string;
  criteria: string;
  difficulty: string;
  reward_points: number;
  deadline: string | null;
  status: string;
  participants_count: number;
  participant_id: string | null;
  participant_status: string | null;
  submission_text: string | null;
  review_note: string | null;
}

missionsRouter.get(
  '/missions',
  authRequired,
  asyncHandler((req, res) => {
    const rows = db
      .prepare(
        `SELECT m.*,
          (SELECT COUNT(*) FROM mission_participants p WHERE p.mission_id = m.id) AS participants_count,
          p.id AS participant_id, p.status AS participant_status,
          p.submission_text, p.review_note
         FROM missions m
         LEFT JOIN mission_participants p ON p.mission_id = m.id AND p.user_id = ?
         WHERE m.status = 'active'
         ORDER BY
           CASE m.difficulty WHEN 'easy' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           m.created_at ASC`
      )
      .all(req.user!.id) as unknown as MissionListRow[];

    res.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        criteria: row.criteria,
        difficulty: row.difficulty,
        reward_points: row.reward_points,
        deadline: row.deadline,
        participants_count: row.participants_count,
        participation: row.participant_id
          ? {
              id: row.participant_id,
              status: row.participant_status,
              submission_text: row.submission_text,
              review_note: row.review_note,
            }
          : null,
      }))
    );
  })
);

const joinSchema = z.object({}).default({});

missionsRouter.post(
  '/missions/:id/join',
  authRequired,
  asyncHandler((req, res) => {
    parseBody(joinSchema, req.body ?? {});
    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id) as
      | { id: string; status: string; deadline: string | null }
      | undefined;
    if (!mission) throw new HttpError(404, 'Миссия не найдена');
    if (mission.status !== 'active') throw new HttpError(409, 'Миссия недоступна');
    if (mission.deadline && new Date(mission.deadline).getTime() < Date.now()) {
      throw new HttpError(409, 'Срок выполнения миссии истёк');
    }

    try {
      db.prepare(
        `INSERT INTO mission_participants
          (id, mission_id, user_id, submission_text, status, review_note, reviewed_by, created_at, updated_at)
         VALUES (?, ?, ?, '', 'joined', '', NULL, ?, ?)`
      ).run(uid(), mission.id, req.user!.id, nowIso(), nowIso());
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw new HttpError(409, 'Вы уже участвуете в этой миссии');
      }
      throw error;
    }

    res.status(201).json({ ok: true });
  })
);

const submitSchema = z.object({
  submission_text: z
    .string()
    .trim()
    .min(20, 'Опишите результат подробнее (минимум 20 символов)')
    .max(4000),
});

missionsRouter.post(
  '/missions/:id/submit',
  authRequired,
  asyncHandler((req, res) => {
    const data = parseBody(submitSchema, req.body);
    const participant = db
      .prepare('SELECT * FROM mission_participants WHERE mission_id = ? AND user_id = ?')
      .get(req.params.id, req.user!.id) as
      | { id: string; status: string }
      | undefined;
    if (!participant) throw new HttpError(400, 'Сначала присоединитесь к миссии');
    if (participant.status === 'submitted') throw new HttpError(409, 'Результат уже отправлен на проверку');
    if (participant.status === 'approved') throw new HttpError(409, 'Миссия уже зачтена');

    db.prepare(
      `UPDATE mission_participants
       SET submission_text = ?, status = 'submitted', review_note = '', updated_at = ?
       WHERE id = ?`
    ).run(data.submission_text, nowIso(), participant.id);

    const mission = db.prepare('SELECT title FROM missions WHERE id = ?').get(req.params.id) as
      | { title: string }
      | undefined;

    notifyAdmins({
      type: 'mission_submitted',
      title: 'Новый отчёт по миссии',
      body: `${req.user!.display_name}: «${mission?.title ?? 'Миссия'}».`,
      link: '/app/admin',
    });

    res.json({ ok: true });
  })
);

interface ParticipantRow {
  id: string;
  mission_id: string;
  user_id: string;
  submission_text: string;
  status: string;
  review_note: string;
  created_at: string;
  updated_at: string;
  mission_title: string;
  reward_points: number;
  display_name: string;
  avatar_url: string | null;
  city: string;
  is_demo: number;
}

export const adminMissionsRouter = Router();

adminMissionsRouter.get(
  '/admin/missions/pending',
  authRequired,
  asyncHandler((req, res) => {
    if (req.user!.role !== 'admin') throw new HttpError(403, 'Доступ только для администратора');
    const rows = db
      .prepare(
        `SELECT p.*, m.title AS mission_title, m.reward_points,
                u.display_name, u.avatar_url, u.city, u.is_demo
         FROM mission_participants p
         JOIN missions m ON m.id = p.mission_id
         JOIN profiles u ON u.id = p.user_id
         WHERE p.status = 'submitted'
         ORDER BY p.updated_at ASC`
      )
      .all() as unknown as ParticipantRow[];
    res.json(rows);
  })
);

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).default(''),
});

adminMissionsRouter.post(
  '/admin/missions/participants/:id/review',
  authRequired,
  asyncHandler((req, res) => {
    const admin = req.user!;
    if (admin.role !== 'admin') throw new HttpError(403, 'Доступ только для администратора');
    const data = parseBody(reviewSchema, req.body);

    const participant = db
      .prepare(
        `SELECT p.*, m.title AS mission_title, m.reward_points
         FROM mission_participants p JOIN missions m ON m.id = p.mission_id
         WHERE p.id = ?`
      )
      .get(req.params.id) as ParticipantRow | undefined;
    if (!participant) throw new HttpError(404, 'Участник миссии не найден');
    if (participant.status !== 'submitted') {
      throw new HttpError(409, 'Результат уже проверен');
    }

    let awarded = false;
    tx(() => {
      db.prepare(
        `UPDATE mission_participants
         SET status = ?, review_note = ?, reviewed_by = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        data.action === 'approve' ? 'approved' : 'rejected',
        data.note,
        admin.id,
        nowIso(),
        participant.id
      );

      if (data.action === 'approve') {
        const result = db
          .prepare(
            `INSERT OR IGNORE INTO point_transactions
              (id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at)
             VALUES (?, ?, ?, 'mission_reward', ?, NULL, ?, NULL, ?)`
          )
          .run(
            uid(),
            participant.user_id,
            participant.reward_points,
            `Миссия подтверждена: ${participant.mission_title}`,
            participant.mission_id,
            nowIso()
          );
        awarded = result.changes > 0;
      }

      db.prepare(
        `INSERT INTO admin_audit (id, admin_id, action, entity, entity_id, details, created_at)
         VALUES (?, ?, ?, 'mission_participant', ?, ?, ?)`
      ).run(
        uid(),
        admin.id,
        data.action === 'approve' ? 'mission_approved' : 'mission_rejected',
        participant.id,
        `Миссия «${participant.mission_title}», пользователь ${participant.display_name}`,
        nowIso()
      );

      notify(participant.user_id, {
        type: data.action === 'approve' ? 'mission_approved' : 'mission_rejected',
        title: data.action === 'approve' ? 'Миссия зачтена' : 'Отчёт отклонён',
        body:
          data.action === 'approve'
            ? `«${participant.mission_title}». Начислено ${participant.reward_points} баллов.`
            : `«${participant.mission_title}».${data.note ? ` Комментарий: ${data.note}` : ''}`,
        link: '/app/missions',
      });
    });

    if (awarded) {
      checkAchievements(participant.user_id);
    }

    res.json({ ok: true, awarded, points: awarded ? participant.reward_points : 0 });
  })
);
