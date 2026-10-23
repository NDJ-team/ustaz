import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../auth';
import { db } from '../db';
import { asyncHandler, parseBody } from '../http';
import { buildMe } from '../serialize';
import type { ProfileRow } from '../types';

export const meRouter = Router();

meRouter.get(
  '/me',
  authRequired,
  asyncHandler((req, res) => {
    res.json(buildMe(req.user!));
  })
);

const updateSchema = z.object({
  display_name: z.string().trim().min(2).max(60).optional(),
  city: z.string().trim().max(60).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(800).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  avatar_url: z.string().trim().url('Некорректный URL аватара').max(500).nullable().optional(),
});

meRouter.patch(
  '/me',
  authRequired,
  asyncHandler((req, res) => {
    const data = parseBody(updateSchema, req.body);
    const current = req.user!;

    const next = {
      display_name: data.display_name ?? current.display_name,
      city: data.city ?? current.city,
      headline: data.headline ?? current.headline,
      bio: data.bio ?? current.bio,
      skills: data.skills ? JSON.stringify(data.skills) : current.skills,
      interests: data.interests ? JSON.stringify(data.interests) : current.interests,
      avatar_url: data.avatar_url === undefined ? current.avatar_url : data.avatar_url,
    };

    db.prepare(
      `UPDATE profiles SET display_name = ?, city = ?, headline = ?, bio = ?,
       skills = ?, interests = ?, avatar_url = ? WHERE id = ?`
    ).run(
      next.display_name,
      next.city,
      next.headline,
      next.bio,
      next.skills,
      next.interests,
      next.avatar_url,
      current.id
    );

    const updated = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(current.id) as unknown as ProfileRow;
    res.json(buildMe(updated));
  })
);
