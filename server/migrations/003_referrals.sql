-- Реферальная механика: код пригласившего и учёт приглашённых.
-- Бонус начисляется один раз за каждого нового пользователя.

ALTER TABLE profiles ADD COLUMN referral_code TEXT;
ALTER TABLE profiles ADD COLUMN referred_by TEXT REFERENCES profiles(id) ON DELETE SET NULL;

-- Коды для уже существующих профилей (детерминированно из id).
UPDATE profiles
SET referral_code = UPPER(SUBSTR(REPLACE(id, '-', ''), 1, 8))
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_profiles_referral_code
  ON profiles(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

CREATE TABLE IF NOT EXISTS referrals (
  id             TEXT PRIMARY KEY,
  referrer_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_id     TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL CHECK (points_awarded > 0),
  created_at     TEXT NOT NULL,
  CHECK (referrer_id <> invited_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Расширяем допустимые типы операций: добавляем referral_bonus.
-- SQLite не умеет менять CHECK, поэтому таблица пересоздаётся с переносом данных.
CREATE TABLE point_transactions_new (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL CHECK (amount <> 0),
  transaction_type  TEXT NOT NULL
                    CHECK (transaction_type IN (
                      'session_reward', 'mission_reward', 'reward_redemption',
                      'streak_bonus', 'demo_bonus', 'admin_adjustment', 'referral_bonus'
                    )),
  reason            TEXT NOT NULL,
  booking_id        TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  mission_id        TEXT REFERENCES missions(id) ON DELETE SET NULL,
  redemption_id     TEXT REFERENCES reward_redemptions(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL
);

INSERT INTO point_transactions_new
  (id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at)
SELECT
  id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at
FROM point_transactions;

DROP TABLE point_transactions;
ALTER TABLE point_transactions_new RENAME TO point_transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_user
  ON point_transactions(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_points_booking
  ON point_transactions(booking_id, transaction_type)
  WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_points_mission
  ON point_transactions(mission_id, user_id, transaction_type)
  WHERE mission_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_points_redemption
  ON point_transactions(redemption_id)
  WHERE redemption_id IS NOT NULL;
