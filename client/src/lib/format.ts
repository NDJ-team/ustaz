import type { Role } from './types';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return fullDateFormatter.format(date);
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return 'Сегодня';
  if (same(date, tomorrow)) return 'Завтра';
  return dateFormatter.format(date);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-teal-500 to-emerald-500',
  'from-sky-500 to-indigo-500',
  'from-fuchsia-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-teal-500',
];

export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export const ROLE_LABELS: Record<Role, string> = {
  learner: 'Ученик',
  mentor: 'Наставник',
  admin: 'Администратор',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
  disputed: 'Спорная',
};

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  completed: 'bg-teal-50 text-teal-700 ring-teal-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  disputed: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Простая',
  medium: 'Средняя',
  hard: 'Сложная',
};

export const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-teal-50 text-teal-700 ring-teal-200',
  medium: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  hard: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const PARTICIPATION_LABELS: Record<string, string> = {
  joined: 'Вы участвуете',
  submitted: 'Отправлено на проверку',
  approved: 'Зачтено',
  rejected: 'Отклонено',
};

export const TRANSACTION_LABELS: Record<string, string> = {
  session_reward: 'Награда за сессию',
  mission_reward: 'Награда за миссию',
  reward_redemption: 'Обмен на бонус',
  demo_bonus: 'Демо-бонус',
  admin_adjustment: 'Корректировка администратора',
  streak_bonus: 'Бонус за серию',
  referral_bonus: 'Бонус за друга',
};

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
