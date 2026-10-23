-- USTAZ MVP schema (SQLite)
-- Баланс пользователя НЕ хранится в profiles: он всегда вычисляется
-- как сумма доверенного журнала point_transactions.

CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('learner', 'mentor', 'admin')),
  city           TEXT NOT NULL DEFAULT '',
  headline       TEXT NOT NULL DEFAULT '',
  bio            TEXT NOT NULL DEFAULT '',
  skills         TEXT NOT NULL DEFAULT '[]',
  interests      TEXT NOT NULL DEFAULT '[]',
  avatar_url     TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  is_blocked     INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE TABLE IF NOT EXISTS mentor_slots (
  id          TEXT PRIMARY KEY,
  mentor_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'booked', 'completed', 'cancelled')),
  created_at  TEXT NOT NULL,
  UNIQUE (mentor_id, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_slots_mentor ON mentor_slots(mentor_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id                    TEXT PRIMARY KEY,
  mentor_id             TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  learner_id            TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_id               TEXT NOT NULL UNIQUE REFERENCES mentor_slots(id) ON DELETE CASCADE,
  topic                 TEXT NOT NULL,
  note                  TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'disputed')),
  learner_confirmed_at  TEXT,
  mentor_confirmed_at   TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  CHECK (mentor_id <> learner_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_mentor ON bookings(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_learner ON bookings(learner_id, status);

CREATE TABLE IF NOT EXISTS missions (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  criteria       TEXT NOT NULL DEFAULT '',
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reward_points  INTEGER NOT NULL CHECK (reward_points > 0),
  deadline       TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_participants (
  id               TEXT PRIMARY KEY,
  mission_id       TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_text  TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'joined'
                   CHECK (status IN ('joined', 'submitted', 'approved', 'rejected')),
  review_note      TEXT NOT NULL DEFAULT '',
  reviewed_by      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  UNIQUE (mission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON mission_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON mission_participants(status);

CREATE TABLE IF NOT EXISTS rewards (
  id                  TEXT PRIMARY KEY,
  partner_name        TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  conditions          TEXT NOT NULL DEFAULT '',
  points_cost         INTEGER NOT NULL CHECK (points_cost > 0),
  available_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  is_demo             INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0, 1)),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id           TEXT PRIMARY KEY,
  reward_id    TEXT NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  user_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  coupon_code  TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON reward_redemptions(user_id);

-- Журнал операций — единственный источник истины для баланса.
CREATE TABLE IF NOT EXISTS point_transactions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL CHECK (amount <> 0),
  transaction_type  TEXT NOT NULL
                    CHECK (transaction_type IN (
                      'session_reward', 'mission_reward', 'reward_redemption',
                      'streak_bonus', 'demo_bonus', 'admin_adjustment'
                    )),
  reason            TEXT NOT NULL,
  booking_id        TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  mission_id        TEXT REFERENCES missions(id) ON DELETE SET NULL,
  redemption_id     TEXT REFERENCES reward_redemptions(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON point_transactions(user_id, created_at DESC);

-- Идемпотентность: одна сессия = одна награда, одна миссия = одна награда,
-- один обмен = одно списание.
CREATE UNIQUE INDEX IF NOT EXISTS ux_points_booking
  ON point_transactions(booking_id, transaction_type)
  WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_points_mission
  ON point_transactions(mission_id, user_id, transaction_type)
  WHERE mission_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_points_redemption
  ON point_transactions(redemption_id)
  WHERE redemption_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS achievements (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  condition_type  TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TEXT NOT NULL,
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  mentor_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  learner_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_mentor ON reviews(mentor_id);

CREATE TABLE IF NOT EXISTS admin_audit (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  details     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
