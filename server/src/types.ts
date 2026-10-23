export type Role = 'learner' | 'mentor' | 'admin';

export interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: Role;
  city: string;
  headline: string;
  bio: string;
  skills: string;
  interests: string;
  avatar_url: string | null;
  is_demo: number;
  is_blocked: number;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
}

export interface MentorRow extends ProfileRow {
  rating: number | null;
  reviews_count: number;
  sessions_count: number;
  available_slots: number;
  next_slot: string | null;
}

export interface SlotRow {
  id: string;
  mentor_id: string;
  starts_at: string;
  ends_at: string;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  created_at: string;
}

export interface BookingRow {
  id: string;
  mentor_id: string;
  learner_id: string;
  slot_id: string;
  topic: string;
  note: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'disputed';
  learner_confirmed_at: string | null;
  mentor_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reason: string;
  booking_id: string | null;
  mission_id: string | null;
  redemption_id: string | null;
  created_at: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: ProfileRow;
    }
  }
}
