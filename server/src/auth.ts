import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { HttpError } from './http';
import type { ProfileRow } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'ustaz-dev-secret-change-me';

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET не задан — используется dev-секрет. Не используйте это в production.');
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      throw new HttpError(401, 'Требуется авторизация');
    }
    const token = header.slice('Bearer '.length).trim();
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, 'Сессия истекла, войдите снова');
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId) as
      | ProfileRow
      | undefined;

    if (!user) throw new HttpError(401, 'Пользователь не найден');
    if (user.is_blocked) throw new HttpError(403, 'Аккаунт заблокирован администратором');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function adminRequired(req: Request, res: Response, next: NextFunction): void {
  authRequired(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    if (req.user?.role !== 'admin') {
      next(new HttpError(403, 'Доступ только для администратора'));
      return;
    }
    next();
  });
}
