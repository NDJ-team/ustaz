import { useMemo, useState } from 'react';
import { Coins, Gift, Info, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/lib/auth';
import type { PointTransaction } from '@/lib/types';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Progress,
  Skeleton,
  Stat,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { EarnPointsCard } from '@/components/EarnPoints';
import { formatDateTime, pluralize, TRANSACTION_LABELS } from '@/lib/format';

type Filter = 'all' | 'earned' | 'spent';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'earned', label: 'Начисления' },
  { id: 'spent', label: 'Списания' },
];

export function PointsPage() {
  const { me } = useAuth();
  const transactions = useAsync<PointTransaction[]>(
    () => api.get<PointTransaction[]>('/points/transactions?limit=200'),
    []
  );
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const rows = transactions.data ?? [];
    if (filter === 'all') return rows;
    if (filter === 'earned') return rows.filter((tx) => tx.amount > 0);
    return rows.filter((tx) => tx.amount < 0);
  }, [transactions.data, filter]);

  if (!me) return null;
  const { balance, earned, level, stats } = me;
  const nextAt = level.nextAt ?? 0;
  const left = level.nextName ? Math.max(0, nextAt - earned) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Баллы и финансы"
        description="Баллы репутации и реальные деньги — разные системы. Здесь показан только журнал баллов."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Текущий баланс" value={balance} icon={<Coins className="h-4 w-4" />} />
        <Stat
          label="Заработано всего"
          value={earned}
          icon={<TrendingUp className="h-4 w-4" />}
          hint="Сумма всех начислений"
        />
        <Stat
          label="Потрачено"
          value={stats.points_spent}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <Stat
          label="Проведено сессий"
          value={stats.sessions_completed}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Уровень: {level.name}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {level.nextName
                ? `До уровня «${level.nextName}» осталось ${left} ${pluralize(
                    left,
                    'балл',
                    'балла',
                    'баллов'
                  )}`
                : 'Максимальный уровень достигнут'}
            </p>
          </div>
          <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
            {earned}
            {level.nextAt ? ` / ${level.nextAt}` : ''}
          </Badge>
        </div>
        <div className="mt-4">
          <Progress value={level.progress} />
          <p className="mt-1 text-right text-xs text-slate-400">
            {Math.round(level.progress * 100)}%
          </p>
        </div>
      </Card>

      <EarnPointsCard />

      <Card>
        <CardHeader
          title="Разделяем репутацию и деньги"
          subtitle="Текущая демо-экономика и будущая финансовая модель"
          icon={<Info className="h-4 w-4" />}
        />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-xl bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-950">USTAZ Points · работает в MVP</p>
            <ul className="mt-2 space-y-1.5 text-sm text-indigo-900/80">
              <li>Начисляются за проведённые сессии, миссии и приглашения.</li>
              <li>Баланс берётся из серверного журнала операций.</li>
              <li>Не имеют денежного курса, не выводятся и не оплачивают курсы.</li>
            </ul>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Деньги · пока не подключены</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>Оплата курсов и перечисление дохода наставнику не проводятся.</li>
              <li>Комиссии платформы, возвраты и налоги не определены.</li>
              <li>Цены в карточках — примеры, не оферта и не запрос платежа.</li>
            </ul>
          </div>
        </div>
        <p className="px-5 pb-5 text-xs text-slate-500">
          До реальных платежей понадобятся платёжный провайдер, правила комиссий и возвратов,
          проверка личности/налоговых требований и отдельный финансовый учёт.
        </p>
      </Card>

      <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        Баллы — показатель вклада в сообщество. Отзывы и рейтинг наставника учитываются отдельно;
        баллы нельзя трактовать как зарплату или обещание дохода.
      </div>

      <Card>
        <CardHeader
          title="Журнал операций"
          subtitle={`${filtered.length} ${pluralize(
            filtered.length,
            'запись',
            'записи',
            'записей'
          )} из ${transactions.data?.length ?? 0}`}
          icon={<Coins className="h-4 w-4" />}
        />
        <div className="p-2 sm:p-4">
          {transactions.loading && !transactions.data && (
            <div className="space-y-2 py-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-2 py-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
              ))}
            </div>
          )}
          {transactions.error && (
            <ErrorState message={transactions.error} onRetry={() => void transactions.reload()} />
          )}

          {transactions.data && transactions.data.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const count =
                  item.id === 'all'
                    ? (transactions.data?.length ?? 0)
                    : item.id === 'earned'
                      ? (transactions.data?.filter((tx) => tx.amount > 0).length ?? 0)
                      : (transactions.data?.filter((tx) => tx.amount < 0).length ?? 0);
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                    <span
                      className={`rounded-full px-1.5 text-xs ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!transactions.loading && !transactions.error && filtered.length === 0 && (
            <EmptyState
              icon={<Coins className="h-6 w-6" />}
              title={transactions.data?.length ? 'Ничего не найдено' : 'Операций пока нет'}
              description={
                transactions.data?.length
                  ? 'В этой категории пока нет записей.'
                  : 'Проведите сессию или выполните миссию, чтобы получить первые баллы.'
              }
            />
          )}

          {filtered.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {filtered.map((tx) => {
                const positive = tx.amount > 0;
                return (
                  <li key={tx.id} className="flex items-center justify-between gap-4 px-2 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          positive
                            ? 'bg-teal-50 text-teal-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {positive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{tx.reason}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {TRANSACTION_LABELS[tx.transaction_type] ?? tx.transaction_type} ·{' '}
                          {formatDateTime(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        positive ? 'text-teal-600' : 'text-rose-600'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {tx.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400">
        Всего операций: {transactions.data?.length ?? 0}{' '}
        {pluralize(transactions.data?.length ?? 0, 'запись', 'записи', 'записей')}
      </p>
    </div>
  );
}
