import { db } from './db';
import { nowIso, uid } from './utils';

/**
 * Внутренние уведомления. Вызываются внутри тех же транзакций, что и
 * бизнес-событие, поэтому уведомление не может «отстать» от изменения данных.
 */

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string | null;
}

export function notify(userId: string, input: NotifyInput): void {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    uid(),
    userId,
    input.type,
    input.title,
    input.body ?? '',
    input.link ?? null,
    nowIso()
  );
}

/** Уведомить всех активных администраторов (например, о новом споре). */
export function notifyAdmins(input: NotifyInput): void {
  const admins = db
    .prepare(`SELECT id FROM profiles WHERE role = 'admin' AND is_blocked = 0`)
    .all() as Array<{ id: string }>;

  for (const admin of admins) {
    notify(admin.id, input);
  }
}
