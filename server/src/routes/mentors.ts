import { Router } from 'express';
import { authRequired } from '../auth';
import { CATEGORIES } from '../config';
import { db } from '../db';
import { HttpError } from '../http';
import { publicProfile } from '../serialize';
import type { ProfileRow } from '../types';

export const mentorsRouter = Router();

const baseSelect = `
  SELECT p.*,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.mentor_id = p.id) AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.mentor_id = p.id) AS reviews_count,
    (SELECT COUNT(*) FROM bookings b WHERE b.mentor_id = p.id AND b.status = 'completed') AS sessions_count,
    (SELECT COUNT(*) FROM mentor_slots s
      WHERE s.mentor_id = p.id AND s.status = 'available' AND s.starts_at > ?) AS available_slots,
    (SELECT MIN(s.starts_at) FROM mentor_slots s
      WHERE s.mentor_id = p.id AND s.status = 'available' AND s.starts_at > ?) AS next_slot
  FROM profiles p
  WHERE p.role = 'mentor' AND p.is_blocked = 0
`;

type MentorAggRow = ProfileRow & {
  rating: number | null;
  reviews_count: number;
  sessions_count: number;
  available_slots: number;
  next_slot: string | null;
};

function mapMentor(row: MentorAggRow) {
  return {
    ...publicProfile(row),
    stats: {
      rating: row.rating ? Number(Number(row.rating).toFixed(1)) : null,
      reviews_count: Number(row.reviews_count),
      sessions_count: Number(row.sessions_count),
      available_slots: Number(row.available_slots),
      next_slot: row.next_slot,
    },
  };
}

mentorsRouter.get('/mentors', (req, res) => {
  const now = new Date().toISOString();
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'rating';

  let sql = baseSelect;
  const params: Array<string> = [now, now];

  if (q) {
    const like = `%${q}%`;
    const clauses = [
      'p.display_name LIKE ?',
      'p.headline LIKE ?',
      'p.bio LIKE ?',
      'p.skills LIKE ?',
      'p.city LIKE ?',
    ];
    params.push(like, like, like, like, like);

    // Русскоязычный запрос («дизайн», «английский») должен находить категорию,
    // даже если в навыках хранится её id (design, english).
    const matchingCategories = CATEGORIES.filter(
      (item) =>
        item.label.toLowerCase().includes(q.toLowerCase()) ||
        item.id.toLowerCase().includes(q.toLowerCase())
    );
    for (const item of matchingCategories) {
      clauses.push('p.skills LIKE ?');
      params.push(`%${item.id}%`);
    }

    sql += ` AND (${clauses.join(' OR ')})`;
  }
  if (category) {
    const known = CATEGORIES.find((item) => item.id === category || item.label === category);
    sql += ` AND p.skills LIKE ?`;
    params.push(`%${known?.id ?? category}%`);
  }
  if (city) {
    sql += ` AND p.city = ?`;
    params.push(city);
  }

  if (sort === 'sessions') {
    sql += ` ORDER BY sessions_count DESC, p.created_at DESC`;
  } else if (sort === 'new') {
    sql += ` ORDER BY p.created_at DESC`;
  } else {
    sql += ` ORDER BY rating DESC, sessions_count DESC`;
  }
  sql += ` LIMIT 100`;

  const rows = db.prepare(sql).all(...params) as unknown as MentorAggRow[];
  res.json(rows.map(mapMentor));
});

mentorsRouter.get('/mentors/:id', (req, res) => {
  const now = new Date().toISOString();
  const row = db
    .prepare(`${baseSelect} AND p.id = ?`)
    .get(now, now, req.params.id) as MentorAggRow | undefined;

  if (!row) throw new HttpError(404, 'Наставник не найден');

  const slots = db
    .prepare(
      `SELECT id, starts_at, ends_at, status FROM mentor_slots
       WHERE mentor_id = ? AND status = 'available' AND starts_at > ?
       ORDER BY starts_at ASC LIMIT 40`
    )
    .all(row.id, now);

  const reviews = db
    .prepare(
      `SELECT r.id, r.rating, r.text, r.created_at,
              lp.display_name AS learner_name, lp.avatar_url AS learner_avatar, lp.city AS learner_city
       FROM reviews r
       JOIN profiles lp ON lp.id = r.learner_id
       WHERE r.mentor_id = ?
       ORDER BY r.created_at DESC LIMIT 20`
    )
    .all(row.id)
    .map((review) => {
      const r = review as Record<string, unknown>;
      return {
        id: r.id,
        rating: r.rating,
        text: r.text,
        created_at: r.created_at,
        learner: {
          display_name: r.learner_name,
          avatar_url: r.learner_avatar,
          city: r.learner_city,
        },
      };
    });

  res.json({ ...mapMentor(row), slots, reviews });
});

mentorsRouter.get('/mentors/:id/slots', (req, res) => {
  const now = new Date().toISOString();
  const mentor = db
    .prepare(`SELECT id FROM profiles WHERE id = ? AND role = 'mentor' AND is_blocked = 0`)
    .get(req.params.id);
  if (!mentor) throw new HttpError(404, 'Наставник не найден');

  const slots = db
    .prepare(
      `SELECT id, starts_at, ends_at, status FROM mentor_slots
       WHERE mentor_id = ? AND status = 'available' AND starts_at > ?
       ORDER BY starts_at ASC`
    )
    .all(req.params.id, now);

  res.json(slots);
});

mentorsRouter.get(
  '/mentors/:id/availability',
  authRequired,
  (req, res) => {
    const now = new Date().toISOString();
    const slots = db
      .prepare(
        `SELECT id, starts_at, ends_at FROM mentor_slots
         WHERE mentor_id = ? AND status = 'available' AND starts_at > ?
         ORDER BY starts_at ASC`
      )
      .all(req.params.id, now);
    res.json(slots);
  }
);
