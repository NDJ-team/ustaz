import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Copy,
  Gift,
  Link2,
  Package,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/lib/auth';
import type { Redemption, Reward } from '@/lib/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DemoBadge,
  EmptyState,
  ErrorState,
  Modal,
  Progress,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { EarnPointsCard } from '@/components/EarnPoints';
import { useToast } from '@/components/Toast';
import { formatDateTime, pluralize } from '@/lib/format';

interface RewardsResponse {
  rewards: Reward[];
  balance: number;
}

type Tab = 'catalog' | 'mine';
type Filter = 'all' | 'available' | 'cheap';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Все примеры' },
  { id: 'available', label: 'Доступны' },
  { id: 'cheap', label: 'До 300 баллов' },
];

export function RewardsPage() {
  const { me, refresh } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('catalog');
  const [filter, setFilter] = useState<Filter>('all');

  const rewards = useAsync<RewardsResponse>(() => api.get<RewardsResponse>('/rewards'), []);
  const mine = useAsync<Redemption[]>(() => api.get<Redemption[]>('/rewards/my'), [tab]);

  const [selected, setSelected] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);

  async function redeem() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api.post<{ coupon_code: string }>(`/rewards/${selected.id}/redeem`, {
        confirm: true,
      });
      setCoupon(result.coupon_code);
      setSelected(null);
      toast.success(`Купон ${result.coupon_code} уже в разделе «Мои бонусы»`);
      await rewards.reload();
      await mine.reload();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обменять баллы');
    } finally {
      setBusy(false);
    }
  }

  const balance = rewards.data?.balance ?? me?.balance ?? 0;
  const earned = me?.earned ?? 0;
  const level = me?.level;
  const nextAt = level?.nextAt ?? 0;
  const left = level?.nextName ? Math.max(0, nextAt - earned) : 0;

  const list = rewards.data?.rewards ?? [];
  const filteredRewards = useMemo(() => {
    if (filter === 'cheap') return list.filter((r) => r.points_cost <= 300);
    if (filter === 'available') return list.filter((r) => r.available_quantity > 0);
    return list;
  }, [list, filter]);

  const [refCopied, setRefCopied] = useState(false);
  const referralCode = me?.referral.code ?? 'USTAZ';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${referralCode}` : `/register?ref=${referralCode}`;

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setRefCopied(true);
      toast.success('Ссылка-приглашение скопирована');
      setTimeout(() => setRefCopied(false), 2000);
    } catch {
      setRefCopied(false);
      toast.error('Не удалось скопировать ссылку');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Демо-бонусы"
        description="Дополнительная демонстрация использования баллов. Бонусы не заменяют отзывы, репутацию и развитие навыков."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-200/60 to-orange-100/40 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-slate-500">Доступно баллов</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900">{balance}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-50 text-amber-700 ring-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Дополнительная мотивация
              </Badge>
              <Badge className="bg-white/80 text-slate-600 ring-slate-200">
                <Gift className="h-3.5 w-3.5" />
                {list.length} демо-предложений
              </Badge>
            </div>
          </div>
          {level && (
            <div className="relative mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Уровень: {level.name}</p>
                <p className="text-xs text-slate-500">
                  {level.nextName
                    ? `До «${level.nextName}» — ${left} ${pluralize(
                        left,
                        'балл',
                        'балла',
                        'баллов'
                      )}`
                    : 'Максимальный уровень'}
                </p>
              </div>
              <Progress value={level.progress} className="mt-2" />
            </div>
          )}
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-200/60 to-violet-100/40 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Share2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Пригласить друга</p>
                  <p className="text-xs text-slate-500">Бонус за каждого нового пользователя</p>
                </div>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                <Users className="h-3.5 w-3.5" />
                +50 баллов
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <p className="flex-1 truncate text-xs text-slate-600">{referralLink}</p>
              <Button size="sm" variant="outline" onClick={() => void copyReferral()}>
                <Copy className="h-3.5 w-3.5" />
                {refCopied ? 'Скопировано' : 'Копировать'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Реферальный код: <span className="font-medium text-slate-600">{referralCode}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Приглашено:{' '}
                <span className="font-medium text-slate-700">{me?.referral.invited ?? 0}</span>
              </span>
              <span>
                Начислено:{' '}
                <span className="font-medium text-teal-600">
                  {me?.referral.points_earned ?? 0} баллов
                </span>
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'catalog', label: 'Каталог бонусов' },
          { id: 'mine', label: 'Мои бонусы', count: mine.data?.length },
        ]}
      />

      {tab === 'catalog' && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Демо-витрина баллов</p>
                <p className="text-xs text-slate-500">
                  Выберите пример бонуса для демонстрации
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                  const count =
                    item.id === 'all'
                      ? list.length
                      : item.id === 'available'
                        ? list.filter((r) => r.available_quantity > 0).length
                        : list.filter((r) => r.points_cost <= 300).length;
                  const active = filter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-slate-900'
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
            </div>
          </Card>

          {rewards.loading && !rewards.data && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-10 w-10 rounded-2xl" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mt-4 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-5/6" />
                  <Skeleton className="mt-5 h-9 w-full" />
                </Card>
              ))}
            </div>
          )}
          {rewards.error && (
            <ErrorState message={rewards.error} onRetry={() => void rewards.reload()} />
          )}
          {!rewards.loading && !rewards.error && filteredRewards.length === 0 && (
            <EmptyState
              icon={<Gift className="h-6 w-6" />}
              title="В этой категории пусто"
              description="Попробуйте другой фильтр или загляните чуть позже."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                  Показать все примеры
                </Button>
              }
            />
          )}
          {filteredRewards.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRewards.map((reward) => {
                const affordable = balance >= reward.points_cost;
                const available = reward.available_quantity > 0;
                return (
                  <Card
                    key={reward.id}
                    className="relative flex flex-col overflow-hidden p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Gift className="h-5 w-5" />
                      </span>
                      <div className="flex items-center gap-1.5">
                        <DemoBadge />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {reward.partner_name}
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                      {reward.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600">{reward.description}</p>
                    <p className="mt-2 text-xs text-slate-500">{reward.conditions}</p>

                    <div className="mt-auto pt-4">
                      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Осталось</span>
                        <span className="text-slate-600">
                          {reward.available_quantity} шт.
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold text-slate-900">
                            {reward.points_cost}{' '}
                            <span className="text-sm font-medium text-slate-500">баллов</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={!affordable || !available}
                          onClick={() => {
                            setSelected(reward);
                            setError(null);
                          }}
                        >
                          {!available
                            ? 'Закончился'
                            : affordable
                              ? 'Обменять баллы'
                              : `Нужно ${reward.points_cost - balance}`}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <EarnPointsCard />
        </>
      )}

      {tab === 'mine' && (
        <Card>
          <CardHeader title="Мои бонусы" subtitle="Купоны и промокоды" icon={<Ticket className="h-4 w-4" />} />
          <div className="p-5">
            {mine.loading && !mine.data && (
              <div className="space-y-3" aria-busy="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-8 w-28" />
                  </div>
                ))}
              </div>
            )}
            {mine.error && <ErrorState message={mine.error} onRetry={() => void mine.reload()} />}
            {mine.data && mine.data.length === 0 && (
              <EmptyState
                icon={<Package className="h-6 w-6" />}
                title="Вы ещё не обменивали баллы"
                description="Выберите бонус в каталоге, когда накопите достаточно баллов."
              />
            )}
            {mine.data && mine.data.length > 0 && (
              <ul className="space-y-3">
                {mine.data.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.reward.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.reward.partner_name} · {formatDateTime(item.created_at)} · списано{' '}
                        {item.points_spent} баллов
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.reward.is_demo && <DemoBadge />}
                      <code className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold tracking-wide text-slate-800">
                        {item.coupon_code}
                      </code>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Подтвердите обмен"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Отмена
            </Button>
            <Button variant="secondary" onClick={redeem} loading={busy}>
              <CheckCircle2 className="h-4 w-4" />
              Обменять
            </Button>
          </>
        }
      >
        {selected && (
          <>
            {error && <Alert tone="error">{error}</Alert>}
            <p className="text-sm text-slate-600">
              Вы обмениваете <span className="font-semibold">{selected.points_cost}</span> баллов на{' '}
              <span className="font-semibold">{selected.title}</span> от {selected.partner_name}.
            </p>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Ваш баланс</span>
                <span className="font-medium text-slate-800">{balance}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">После обмена</span>
                <span className="font-medium text-slate-800">{balance - selected.points_cost}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Баллы списываются один раз. Купон появится в разделе «Мои бонусы».
            </p>
          </>
        )}
      </Modal>

      <Modal open={Boolean(coupon)} onClose={() => setCoupon(null)} title="Бонус получен!">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="text-sm text-slate-600">Ваш купон активирован. Сохраните код:</p>
          <code className="rounded-xl bg-slate-100 px-5 py-3 text-lg font-bold tracking-wider text-slate-900">
            {coupon}
          </code>
          <p className="text-xs text-slate-500">
            Купон всегда доступен в разделе «Мои бонусы»{' '}
            {pluralize(1, 'раз', 'раза', 'раз')}.
          </p>
        </div>
      </Modal>
    </div>
  );
}
