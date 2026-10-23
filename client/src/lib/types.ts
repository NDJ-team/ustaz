/** Типы, повторяющие контракты REST API USTAZ. */

export type Role = 'learner' | 'mentor' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  role: Role;
  city: string;
  headline: string;
  bio: string;
  skills: string[];
  interests: string[];
  avatar_url: string | null;
  is_demo: boolean;
  is_blocked: boolean;
  created_at: string;
  email?: string;
}

export interface Level {
  name: string;
  index: number;
  earned: number;
  nextName: string | null;
  nextAt: number | null;
  progress: number;
}

export interface UserStats {
  sessions_completed: number;
  sessions_as_learner: number;
  upcoming: number;
  missions_completed: number;
  reviews_count: number;
  rating: number | null;
  points_spent: number;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  unlocked_at: string;
}

export interface Me {
  profile: Profile;
  balance: number;
  earned: number;
  stats: UserStats;
  level: Level;
  achievements: Achievement[];
  referral: {
    code: string;
    invited: number;
    points_earned: number;
  };
}

export interface MentorStats {
  rating: number | null;
  reviews_count: number;
  sessions_count: number;
  available_slots: number;
  next_slot: string | null;
}

export interface Mentor extends Omit<Profile, 'email'> {
  stats: MentorStats;
}

export interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

export interface MentorReview {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  learner: { display_name: string; avatar_url: string | null; city: string };
}

export interface MentorDetail extends Mentor {
  slots: Slot[];
  reviews: MentorReview[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'disputed';

export interface Booking {
  id: string;
  topic: string;
  note: string;
  status: BookingStatus;
  learner_confirmed_at: string | null;
  mentor_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  viewer_role: 'mentor' | 'learner';
  slot: { id: string; starts_at: string; ends_at: string };
  mentor: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    headline: string;
    city: string;
    is_demo: boolean;
  };
  learner: { id: string; display_name: string; avatar_url: string | null; city: string };
  review: { id: string; rating: number | null; text: string | null; created_at: string | null } | null;
  can_review: boolean;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reason: string;
  booking_id: string | null;
  mission_id: string | null;
  redemption_id: string | null;
  created_at: string;
  mission_title?: string | null;
  booking_topic?: string | null;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  criteria: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reward_points: number;
  deadline: string | null;
  participants_count: number;
  participation: {
    id: string;
    status: 'joined' | 'submitted' | 'approved' | 'rejected';
    submission_text: string;
    review_note: string;
  } | null;
}

export interface Reward {
  id: string;
  partner_name: string;
  title: string;
  description: string;
  conditions: string;
  points_cost: number;
  available_quantity: number;
  is_demo: boolean;
  status: string;
}

export interface Redemption {
  id: string;
  coupon_code: string;
  points_spent: number;
  status: string;
  created_at: string;
  reward: {
    id: string;
    title: string;
    partner_name: string;
    description: string;
    conditions: string;
    is_demo: boolean;
  };
}

export interface Meta {
  platform: { name: string; slogan: string; sessionMinutes: number; currencyNote: string };
  points: { sessionReward: number; streakBonus: number; demoLearnerBonus: number };
  levels: Array<{ name: string; minPoints: number }>;
  categories: Array<{ id: string; label: string }>;
  cities: string[];
}

export interface MySlot {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  booking: { id: string; status: BookingStatus; topic: string; learner_name: string } | null;
}

export interface BulkSlotResult {
  created: number;
  skipped: number;
  slots: string[];
  skipped_details: Array<{ starts_at: string; reason: string }>;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationList {
  unread: number;
  items: AppNotification[];
}

export interface BookingSummary {
  upcoming: Array<{
    id: string;
    status: BookingStatus;
    topic: string;
    starts_at: string;
    ends_at: string;
    counterpart: string;
    direction: 'mentor' | 'learner';
  }>;
  stats: UserStats;
  earned: number;
}

/* --- Админка --- */

export interface AdminOverview {
  users: number;
  mentors: number;
  learners: number;
  bookings: number;
  pending_bookings: number;
  disputed_bookings: number;
  missions_to_review: number;
  redemptions: number;
  points_issued: number;
  points_spent: number;
}

export interface AdminUser extends Profile {
  email: string;
  balance: number;
  sessions: number;
}

export interface AdminBooking {
  id: string;
  topic: string;
  status: BookingStatus;
  created_at: string;
  starts_at: string;
  ends_at: string;
  mentor_name: string;
  learner_name: string;
}

export interface AdminTransaction extends PointTransaction {
  user_name: string;
  user_email: string;
  reward_title: string | null;
}

export interface AdminRedemption {
  id: string;
  coupon_code: string;
  points_spent: number;
  status: string;
  created_at: string;
  user_name: string;
  user_email: string;
  reward_title: string;
  partner_name: string;
}

export interface AdminAudit {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string;
  created_at: string;
}

export interface AdminReview extends MentorReview {
  mentor_name: string;
  learner_name: string;
  rating: number;
  text: string;
}

export interface PendingMission {
  id: string;
  user_id: string;
  submission_text: string;
  status: string;
  created_at: string;
  updated_at: string;
  mission_title: string;
  reward_points: number;
  display_name: string;
  avatar_url: string | null;
  city: string;
  is_demo: number;
}
