import { db } from './db';
import { levelFor } from './config';
import { uid, nowIso, parseJsonArray } from './utils';
import type { ProfileRow } from './types';

export function publicProfile(row: ProfileRow, includeEmail = false) {
  return {
    id: row.id,
    display_name: row.display_name,
    role: row.role,
    city: row.city,
    headline: row.headline,
    bio: row.bio,
    skills: parseJsonArray(row.skills),
    interests: parseJsonArray(row.interests),
    avatar_url: row.avatar_url,
    is_demo: Boolean(row.is_demo),
    is_blocked: Boolean(row.is_blocked),
    created_at: row.created_at,
    ...(includeEmail ? { email: row.email } : {}),
  };
}

export function getBalance(userId: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM point_transactions WHERE user_id = ?')
    .get(userId) as { balance: number };
  return Number(row?.balance ?? 0);
}

export function getEarned(userId: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS earned
       FROM point_transactions WHERE user_id = ? AND amount > 0`
    )
    .get(userId) as { earned: number };
  return Number(row?.earned ?? 0);
}

export function getUserStats(userId: string) {
  const sessions = db
    .prepare(
      `SELECT COUNT(*) AS c FROM bookings WHERE mentor_id = ? AND status = 'completed'`
    )
    .get(userId) as { c: number };
  const learnerSessions = db
    .prepare(
      `SELECT COUNT(*) AS c FROM bookings WHERE learner_id = ? AND status = 'completed'`
    )
    .get(userId) as { c: number };
  const upcoming = db
    .prepare(
      `SELECT COUNT(*) AS c FROM bookings
       WHERE (mentor_id = ? OR learner_id = ?) AND status IN ('pending', 'confirmed')`
    )
    .get(userId, userId) as { c: number };
  const missions = db
    .prepare(
      `SELECT COUNT(*) AS c FROM mission_participants
       WHERE user_id = ? AND status = 'approved'`
    )
    .get(userId) as { c: number };
  const reviews = db
    .prepare('SELECT COUNT(*) AS c, COALESCE(AVG(rating), 0) AS avg FROM reviews WHERE mentor_id = ?')
    .get(userId) as { c: number; avg: number };
  const spent = db
    .prepare(
      `SELECT COALESCE(-SUM(amount), 0) AS spent
       FROM point_transactions WHERE user_id = ? AND amount < 0`
    )
    .get(userId) as { spent: number };

  return {
    sessions_completed: Number(sessions.c),
    sessions_as_learner: Number(learnerSessions.c),
    upcoming: Number(upcoming.c),
    missions_completed: Number(missions.c),
    reviews_count: Number(reviews.c),
    rating: reviews.c > 0 ? Number(Number(reviews.avg).toFixed(1)) : null,
    points_spent: Number(spent.spent),
  };
}

export function getUnlockedAchievements(userId: string) {
  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.title, a.description, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = ?
       ORDER BY ua.unlocked_at ASC`
    )
    .all(userId);
  return rows;
}

/**
 * Проверяет условия достижений и фиксирует новые. Повторный вызов безопасен:
 * уникальный индекс (user_id, achievement_id) не даёт задублировать запись.
 */
export function checkAchievements(userId: string): string[] {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId) as
    | ProfileRow
    | undefined;
  if (!profile) return [];

  const stats = getUserStats(userId);
  const earned = getEarned(userId);
  const achievements = db.prepare('SELECT * FROM achievements').all() as Array<{
    id: string;
    title: string;
    condition_type: string;
    condition_value: number;
  }>;

  const unlocked: string[] = [];
  for (const achievement of achievements) {
    let met = false;
    switch (achievement.condition_type) {
      case 'profile_mentor':
        met = profile.role === 'mentor';
        break;
      case 'sessions_completed':
        met = stats.sessions_completed >= achievement.condition_value;
        break;
      case 'missions_approved':
        met = stats.missions_completed >= achievement.condition_value;
        break;
      case 'points_earned':
        met = earned >= achievement.condition_value;
        break;
      case 'reviews_received':
        met = stats.reviews_count >= achievement.condition_value;
        break;
      default:
        met = false;
    }
    if (!met) continue;

    const result = db
      .prepare(
        `INSERT OR IGNORE INTO user_achievements (id, user_id, achievement_id, unlocked_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(uid(), userId, achievement.id, nowIso());
    if (result.changes > 0) unlocked.push(achievement.title);
  }
  return unlocked;
}

export function buildMe(profile: ProfileRow) {
  checkAchievements(profile.id);
  const balance = getBalance(profile.id);
  const earned = getEarned(profile.id);
  const stats = getUserStats(profile.id);
  const referrals = db
    .prepare(
      `SELECT COUNT(*) AS invited, COALESCE(SUM(points_awarded), 0) AS points_earned
       FROM referrals WHERE referrer_id = ?`
    )
    .get(profile.id) as { invited: number; points_earned: number };
  return {
    profile: publicProfile(profile, true),
    balance,
    earned,
    stats,
    level: levelFor(earned),
    achievements: getUnlockedAchievements(profile.id),
    referral: {
      code: profile.referral_code ?? profile.id.slice(0, 8).toUpperCase(),
      invited: Number(referrals.invited),
      points_earned: Number(referrals.points_earned),
    },
  };
}
