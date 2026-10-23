import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../db';
import { signToken } from '../auth';
import { POINTS, RATE_LIMITS } from '../config';
import { asyncHandler, HttpError, parseBody } from '../http';
import { notify } from '../notify';
import { ipEmailKey, ipKey, rateLimit } from '../rate-limit';
import { buildMe, checkAchievements } from '../serialize';
import { hashPassword, makeReferralCode, nowIso, uid, verifyPassword } from '../utils';
import type { ProfileRow } from '../types';

export const authRouter = Router();

/** Защита входа: перебор пароля тормозится и по аккаунту, и по IP. */
const loginLimiters = [
  rateLimit({
    windowMs: RATE_LIMITS.loginWindowMs,
    max: RATE_LIMITS.loginPerAccount,
    key: ipEmailKey('login-account'),
    message: 'Слишком много неудачных попыток входа для этого аккаунта.',
    failuresOnly: true,
    isFailure: (status) => status === 401,
  }),
  rateLimit({
    windowMs: RATE_LIMITS.loginWindowMs,
    max: RATE_LIMITS.loginPerIp,
    key: ipKey('login-ip'),
    message: 'Слишком много неудачных попыток входа с этого адреса.',
    failuresOnly: true,
    isFailure: (status) => status === 401,
  }),
];

/** Защита регистрации от массового создания аккаунтов. */
const registerLimiters = [
  rateLimit({
    windowMs: RATE_LIMITS.registerWindowMs,
    max: RATE_LIMITS.registerPerAccount,
    key: ipEmailKey('register-account'),
    message: 'Слишком много попыток регистрации для этого email.',
  }),
  rateLimit({
    windowMs: RATE_LIMITS.registerWindowMs,
    max: RATE_LIMITS.registerPerIp,
    key: ipKey('register-ip'),
    message: 'Слишком много попыток регистрации с этого адреса.',
  }),
];

const registerSchema = z.object({
  email: z.string().trim().email('Введите корректный email'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов').max(100),
  display_name: z.string().trim().min(2, 'Укажите имя (минимум 2 символа)').max(60),
  role: z.enum(['learner', 'mentor'], {
    errorMap: () => ({ message: 'Выберите роль: ученик или наставник' }),
  }),
  city: z.string().trim().max(60).default(''),
  headline: z.string().trim().max(120).default(''),
  bio: z.string().trim().max(800).default(''),
  interests: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  ref: z.string().trim().max(40).optional().default(''),
});

authRouter.post(
  '/auth/register',
  registerLimiters,
  asyncHandler((req, res) => {
    const data = parseBody(registerSchema, req.body);

    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(data.email);
    if (existing) throw new HttpError(409, 'Аккаунт с таким email уже существует');

    let referrer: { id: string; display_name: string } | undefined;
    if (data.ref) {
      referrer = db
        .prepare(
          `SELECT id, display_name FROM profiles
           WHERE referral_code IS NOT NULL AND UPPER(referral_code) = UPPER(?)`
        )
        .get(data.ref) as { id: string; display_name: string } | undefined;
      if (!referrer) throw new HttpError(400, 'Реферальный код не найден');
    }

    const id = uid();
    let referralCode = makeReferralCode();
    while (db.prepare('SELECT 1 FROM profiles WHERE referral_code = ?').get(referralCode)) {
      referralCode = makeReferralCode();
    }

    tx(() => {
      db.prepare(
        `INSERT INTO profiles
          (id, email, password_hash, display_name, role, city, headline, bio, skills, interests,
           avatar_url, is_demo, is_blocked, referral_code, referred_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, ?, ?, ?)`
      ).run(
        id,
        data.email,
        hashPassword(data.password),
        data.display_name,
        data.role,
        data.city,
        data.headline,
        data.bio,
        JSON.stringify(data.role === 'mentor' ? data.skills : []),
        JSON.stringify(data.interests),
        referralCode,
        referrer?.id ?? null,
        nowIso()
      );

      if (referrer) {
        db.prepare(
          `INSERT INTO referrals (id, referrer_id, invited_id, points_awarded, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).run(uid(), referrer.id, id, POINTS.referralBonus, nowIso());

        db.prepare(
          `INSERT INTO point_transactions
            (id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at)
           VALUES (?, ?, ?, 'referral_bonus', ?, NULL, NULL, NULL, ?)`
        ).run(
          uid(),
          referrer.id,
          POINTS.referralBonus,
          `Бонус за приглашённого друга: ${data.display_name}`,
          nowIso()
        );

        notify(referrer.id, {
          type: 'referral_bonus',
          title: 'Баллы за приглашённого друга',
          body: `${data.display_name} зарегистрировался по вашей ссылке. Начислено ${POINTS.referralBonus} баллов.`,
          link: '/app/points',
        });
      }
    });

    if (referrer) checkAchievements(referrer.id);

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as unknown as ProfileRow;
    res.status(201).json({ token: signToken(id), ...buildMe(profile) });
  })
);

const loginSchema = z.object({
  email: z.string().trim().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

authRouter.post(
  '/auth/login',
  loginLimiters,
  asyncHandler((req, res) => {
    const data = parseBody(loginSchema, req.body);
    const profile = db.prepare('SELECT * FROM profiles WHERE email = ?').get(data.email) as
      | ProfileRow
      | undefined;

    if (!profile || !verifyPassword(data.password, profile.password_hash)) {
      throw new HttpError(401, 'Неверный email или пароль');
    }
    if (profile.is_blocked) throw new HttpError(403, 'Аккаунт заблокирован администратором');

    res.json({ token: signToken(profile.id), ...buildMe(profile) });
  })
);
