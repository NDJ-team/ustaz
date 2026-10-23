import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Coins,
  Gift,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import type { BookingSummary, NotificationList, Reward } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Progress,
  Skeleton,
  Stat,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatDateTime,
  pluralize,
} from '@/lib/format';

export function OverviewPage() {
  const { me } = useAuth();
  const summary = useAsync<BookingSummary>(() => api.get<BookingSummary>('/bookings/summary'), []);
  const notifications = useAsync<NotificationList>(
    () => api.get<NotificationList>('/notifications?limit=10'),
    []
  );
  const rewards = useAsync<{ rewards: Reward[]; balance: number }>(
    () => api.get<{ rewards: Reward[]; balance: number }>('/rewards'),
    []
  );

  if (!me) return null;

  const { profile, level, balance, earned, stats, achievements } = me;
  const isMentor = profile.role === 'mentor';
  const unreadCount = notifications.data?.unread ?? 0;
  const unreadItems = notifications.data?.items.filter((item) => !item.is_read).slice(0, 2) ?? [];

  const rewardList = (rewards.data?.rewards ?? []).filter((reward) => reward.available_quantity > 0);
  const nextReward = rewardList
    .filter((reward) => reward.points_cost > balance)
    .sort((a, b) => a.points_cost - b.points_cost)[0];
  const affordableReward = rewardList
    .filter((reward) => reward.points_cost <= balance)
    .sort((a, b) => b.points_cost - a.points_cost)[0];
  const rewardProgress = nextReward
    ? Math.min(1, Math.max(0, balance / nextReward.points_cost))
    : 1;

  const quickActions = isMentor
    ? [
        { to: '/app/schedule', label: 'Расписание', icon: BookOpenCheck, tone: 'indigo' },
        { to: '/app/bookings', label: 'Мои сессии', icon: CalendarDays, tone: 'slate' },
        { to: '/app/missions', label: 'Миссии', icon: Target, tone: 'slate' },
        { to: '/app/rewards', label: 'Бонусы', icon: Gift, tone: 'slate' },
      ]
    : [
        { to: '/app/mentors', label: 'Найти наставника', icon: Users, tone: 'indigo' },
        { to: '/app/bookings', label: 'Мои сессии', icon: CalendarDays, tone: 'slate' },
        { to: '/app/missions', label: 'Миссии', icon: Target, tone: 'slate' },
        { to: '/app/achievements', label: 'Достижения', icon: Award, tone: 'slate' },
      ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Здравствуйте, ${profile.display_name.split(' ')[0]}!`}
        description="Здесь собрано всё важное: ближайшие сессии, баллы и прогресс."
        action={
          isMentor ? (
            <Link to="/app/schedule">
              <Button>
                <CalendarPlus className="h-4 w-4" />
                Добавить слот
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Баланс баллов"
          value={balance}
          icon={<Coins className="h-4 w-4" />}
          hint={`Заработано всего: ${earned}`}
        />
        <Stat
          label="Уровень"
          value={level.name}
          icon={<TrendingUp className="h-4 w-4" />}
          hint={`До ${level.nextName ?? 'максимума'}: ${
            level.nextAt !== null ? `${Math.max(0, level.nextAt - earned)} баллов` : 'достигнут'
          }`}
        />
        <Stat
          label={isMentor ? 'Проведено сессий' : 'Посещено сессий'}
          value={isMentor ? stats.sessions_completed : stats.sessions_as_learner}
          icon={<CalendarDays className="h-4 w-4" />}
          hint={`Ближайших: ${stats.upcoming}`}
        />
        <Stat
          label="Миссии зачтено"
          value={stats.missions_completed}
          icon={<Target className="h-4 w-4" />}
          hint={achievements.length ? `${achievements.length} достижений` : 'Достижений пока нет'}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Быстрые действия</p>
              <p className="text-xs text-slate-500">Перейти к самому частому</p>
            </div>
          </div>
          <Link
            to="/app/notifications"
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Bell className="h-4 w-4" />
            Уведомления
            {unreadCount > 0 && (
              <Badge className="bg-indigo-600 text-white ring-indigo-600">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      action.tone === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-900">{action.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title="Ближайшие сессии"
            subtitle="Подтверждённые и ожидающие подтверждения"
            icon={<CalendarDays className="h-4 w-4" />}
            action={
              <Link
                to="/app/bookings"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Все сессии
              </Link>
            }
          />
          <div className="p-5">
            {summary.loading && !summary.data && (
              <div className="space-y-4" aria-busy="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            )}
            {summary.error && (
              <ErrorState message={summary.error} onRetry={() => void summary.reload()} />
            )}
            {summary.data && summary.data.upcoming.length === 0 && (
              <EmptyState
                icon={<CalendarDays className="h-6 w-6" />}
                title="Пока нет запланированных сессий"
                description={
                  isMentor
                    ? 'Добавьте доступные слоты, чтобы ученики могли записаться.'
                    : 'Выберите наставника и забронируйте удобное время.'
                }
                action={
                  isMentor ? (
                    <Link to="/app/schedule">
                      <Button variant="outline" size="sm">
                        Открыть расписание
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/app/mentors">
                      <Button variant="outline" size="sm">
                        Каталог наставников
                      </Button>
                    </Link>
                  )
                }
              />
            )}
            {summary.data && summary.data.upcoming.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {summary.data.upcoming.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/app/bookings/${item.id}`}
                      className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.topic}</p>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {item.direction === 'mentor' ? 'Ученик: ' : 'Наставник: '}
                          {item.counterpart} · {formatDateTime(item.starts_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge className={BOOKING_STATUS_STYLES[item.status]}>
                          {BOOKING_STATUS_LABELS[item.status]}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {unreadCount > 0 && (
            <Card className="border-indigo-200 bg-indigo-50/30 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  Новое для вас
                </p>
                <Badge className="bg-indigo-600 text-white ring-indigo-600">{unreadCount}</Badge>
              </div>

              <ul className="mt-3 space-y-2">
                {unreadItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.link ?? '/app/notifications'}
                      className="block rounded-lg bg-white/70 px-3 py-2 transition-colors hover:bg-white"
                    >
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      {item.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                to="/app/notifications"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Все уведомления
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Прогресс уровня</p>
              <Badge className="bg-teal-50 text-teal-700 ring-teal-200">{level.name}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Заработано {earned}{' '}
              {pluralize(earned, 'балл', 'балла', 'баллов')}
              {level.nextAt !== null && ` из ${level.nextAt}`}
            </p>
            <Progress value={level.progress} className="mt-3" />
            <p className="mt-2 text-xs text-slate-500">
              {level.nextName
                ? `До уровня «${level.nextName}» осталось ${(level.nextAt ?? 0) - earned} баллов`
                : 'Максимальный уровень достигнут'}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Gift className="h-4 w-4 text-amber-500" />
                До следующей награды
              </p>
              <Link
                to="/app/rewards"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Витрина
              </Link>
            </div>
            {rewards.loading && !rewards.data && (
              <div className="mt-3 space-y-2" aria-busy="true">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}
            {!rewards.loading && nextReward && (
              <>
                <p className="mt-3 text-sm font-medium text-slate-800">{nextReward.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Не хватает{' '}
                  <span className="font-medium text-slate-700">
                    {nextReward.points_cost - balance}{' '}
                    {pluralize(nextReward.points_cost - balance, 'балла', 'баллов', 'баллов')}
                  </span>
                </p>
                <Progress value={rewardProgress} className="mt-3" />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {balance} из {nextReward.points_cost}
                </p>
              </>
            )}
            {!rewards.loading && !nextReward && affordableReward && (
              <>
                <p className="mt-3 text-sm font-medium text-slate-800">
                  {affordableReward.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Уже доступно за {affordableReward.points_cost}{' '}
                  {pluralize(affordableReward.points_cost, 'балл', 'балла', 'баллов')}
                </p>
                <Link to="/app/rewards">
                  <Button variant="outline" size="sm" className="mt-3">
                    Обменять сейчас
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
            {!rewards.loading && !nextReward && !affordableReward && (
              <p className="mt-3 text-sm text-slate-500">
                Витрина пока пуста — загляните позже.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Достижения</p>
              <Link
                to="/app/achievements"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Все
              </Link>
            </div>
            {achievements.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Пока нет достижений. Проведите первую сессию или выполните миссию.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {achievements.slice(0, 3).map((achievement) => (
                  <li key={achievement.id} className="flex items-start gap-2.5">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{achievement.title}</p>
                      <p className="text-xs text-slate-500">{achievement.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="bg-gradient-to-br from-indigo-600 to-teal-500 p-5 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Gift className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold">Обменяйте баллы на бонусы</p>
            <p className="mt-1 text-sm text-white/85">
              Ваш баланс: {balance} {pluralize(balance, 'балл', 'балла', 'баллов')}
            </p>
            <Link to="/app/rewards">
              <Button size="sm" className="mt-4 bg-white text-indigo-700 hover:bg-white/90">
                Открыть бонусы
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {profile.is_demo && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Это демонстрационный аккаунт — данные созданы для показа платформы.
        </div>
      )}
    </div>
  );
}
