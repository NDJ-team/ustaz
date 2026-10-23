import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronRight, Star, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/lib/auth';
import type { Booking, BookingStatus } from '@/lib/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatDayLabel,
  formatTime,
} from '@/lib/format';

type Scope = 'upcoming' | 'history' | 'all';
type StatusFilter = BookingStatus | 'all';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Все статусы' },
  { id: 'pending', label: 'Ожидают' },
  { id: 'confirmed', label: 'Подтверждены' },
  { id: 'completed', label: 'Завершены' },
  { id: 'cancelled', label: 'Отменены' },
  { id: 'disputed', label: 'Споры' },
];

const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

const HINT_TONES: Record<BookingStatus, string> = {
  pending: 'text-amber-600',
  confirmed: 'text-teal-600',
  completed: 'text-slate-500',
  cancelled: 'text-slate-400',
  disputed: 'text-rose-600',
};

function statusHint(booking: Booking): string {
  switch (booking.status) {
    case 'pending':
      return booking.viewer_role === 'mentor'
        ? 'Ждёт вашего подтверждения'
        : 'Ждёт подтверждения наставника';
    case 'confirmed':
      return 'Встреча подтверждена';
    case 'completed':
      if (booking.viewer_role === 'learner' && booking.can_review) {
        return 'Завершена — можно оставить отзыв';
      }
      return 'Сессия завершена';
    case 'cancelled':
      return 'Сессия отменена';
    case 'disputed':
      return 'Открыт спор — администратор разберётся';
    default:
      return '';
  }
}

export function BookingsPage() {
  const { me } = useAuth();
  const [scope, setScope] = useState<Scope>('upcoming');
  const [status, setStatus] = useState<StatusFilter>('all');
  const bookings = useAsync<Booking[]>(() => api.get<Booking[]>('/bookings?scope=all'), []);

  const isMentor = me?.profile.role === 'mentor';
  const all = bookings.data ?? [];
  const now = Date.now();

  function inScope(booking: Booking, target: Scope): boolean {
    const startsAt = new Date(booking.slot.starts_at).getTime();
    if (target === 'upcoming') {
      return (booking.status === 'pending' || booking.status === 'confirmed') && startsAt >= now;
    }
    if (target === 'history') {
      return (
        booking.status === 'completed' ||
        booking.status === 'cancelled' ||
        booking.status === 'disputed' ||
        startsAt < now
      );
    }
    return true;
  }

  const scoped = all.filter((booking) => inScope(booking, scope));
  const visible = scoped
    .filter((booking) => status === 'all' || booking.status === status)
    .sort((a, b) => {
      const diff =
        new Date(a.slot.starts_at).getTime() - new Date(b.slot.starts_at).getTime();
      return scope === 'upcoming' ? diff : -diff;
    });

  const counts: Record<StatusFilter, number> = {
    all: scoped.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    disputed: 0,
  };
  for (const booking of scoped) counts[booking.status] += 1;

  const scopeCounts = {
    upcoming: all.filter((booking) => inScope(booking, 'upcoming')).length,
    history: all.filter((booking) => inScope(booking, 'history')).length,
    all: all.length,
  };

  const activeStatusLabel =
    STATUS_FILTERS.find((item) => item.id === status)?.label ?? 'Все статусы';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои сессии"
        description={
          isMentor
            ? 'Заявки учеников, подтверждённые встречи и завершённые консультации.'
            : 'Заявки, подтверждённые встречи и завершённые консультации.'
        }
        action={
          isMentor ? (
            <Link to="/app/schedule">
              <Button variant="outline">
                <CalendarPlus className="h-4 w-4" />
                Расписание
              </Button>
            </Link>
          ) : (
            <Link to="/app/mentors">
              <Button>
                <Users className="h-4 w-4" />
                Найти наставника
              </Button>
            </Link>
          )
        }
      />

      <div className="space-y-3">
        <Tabs<Scope>
          value={scope}
          onChange={(next) => {
            setScope(next);
            setStatus('all');
          }}
          tabs={[
            { id: 'upcoming', label: 'Предстоящие', count: scopeCounts.upcoming },
            { id: 'history', label: 'История', count: scopeCounts.history },
            { id: 'all', label: 'Все', count: scopeCounts.all },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => {
            const active = status === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-900'
                }`}
              >
                {item.label}
                <span className={`text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {bookings.loading && !bookings.data && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      )}
      {bookings.error && (
        <ErrorState message={bookings.error} onRetry={() => void bookings.reload()} />
      )}

      {bookings.data && visible.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={
            status !== 'all' && scoped.length > 0
              ? `Нет сессий со статусом «${activeStatusLabel}»`
              : 'Здесь пока пусто'
          }
          description={
            status !== 'all' && scoped.length > 0
              ? 'Попробуйте другой статус или сбросьте фильтр.'
              : scope === 'upcoming'
                ? 'Забронируйте сессию у наставника — она появится в этом списке.'
                : 'Завершённых сессий ещё нет.'
          }
          action={
            status !== 'all' && scoped.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setStatus('all')}>
                Сбросить фильтр
              </Button>
            ) : scope === 'upcoming' ? (
              <Link to="/app/mentors">
                <Button variant="outline" size="sm">
                  Найти наставника
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {bookings.data && visible.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Найдено: <span className="font-medium text-slate-900">{visible.length}</span>
          </p>

          {visible.map((booking) => {
            const counterpart =
              booking.viewer_role === 'mentor' ? booking.learner : booking.mentor;
            const start = booking.slot.starts_at;
            const date = new Date(start);
            const month = MONTHS_SHORT[date.getMonth()] ?? '';
            const hint = statusHint(booking);

            return (
              <Card key={booking.id} className="p-4 transition-shadow hover:shadow-md">
                <Link
                  to={`/app/bookings/${booking.id}`}
                  className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                      <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">
                        {month}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">{booking.topic}</h3>
                        <Badge className={BOOKING_STATUS_STYLES[booking.status]}>
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </Badge>
                        {booking.review?.rating && (
                          <Badge className="bg-amber-50 text-amber-700 ring-amber-200">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {booking.review.rating}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <Avatar
                          name={counterpart.display_name}
                          size={24}
                          src={counterpart.avatar_url}
                        />
                        <p className="truncate text-sm text-slate-500">
                          {booking.viewer_role === 'mentor' ? 'Ученик: ' : 'Наставник: '}
                          <span className="font-medium text-slate-700">
                            {counterpart.display_name}
                          </span>
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDayLabel(start)} · {formatTime(start)}–
                        {formatTime(booking.slot.ends_at)}
                      </p>

                      {hint && (
                        <p className={`mt-1.5 text-xs font-medium ${HINT_TONES[booking.status]}`}>
                          {hint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <span className="text-xs text-slate-400">
                      {booking.viewer_role === 'mentor' ? 'вы наставник' : 'вы ученик'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
