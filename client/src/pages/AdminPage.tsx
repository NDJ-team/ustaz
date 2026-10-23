import { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  FileWarning,
  Gavel,
  Gift,
  Search,
  ShieldCheck,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import type {
  AdminAudit,
  AdminBooking,
  AdminOverview,
  AdminRedemption,
  AdminReview,
  AdminTransaction,
  AdminUser,
  PendingMission,
} from '@/lib/types';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DemoBadge,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Spinner,
  Stat,
  Tabs,
  Textarea,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatDateTime,
  ROLE_LABELS,
  TRANSACTION_LABELS,
} from '@/lib/format';

type Tab = 'overview' | 'missions' | 'disputes' | 'users' | 'finance' | 'audit';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Админ-панель"
        description="Модерация миссий, разбор споров, управление пользователями и прозрачная отчётность."
      />

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Обзор' },
          { id: 'missions', label: 'Миссии' },
          { id: 'disputes', label: 'Споры и сессии' },
          { id: 'users', label: 'Пользователи' },
          { id: 'finance', label: 'Баллы и бонусы' },
          { id: 'audit', label: 'Журнал действий' },
        ]}
      />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'missions' && <MissionsTab />}
      {tab === 'disputes' && <BookingsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

function OverviewTab() {
  const overview = useAsync<AdminOverview>(() => api.get<AdminOverview>('/admin/overview'), []);

  if (overview.loading) return <Spinner />;
  if (overview.error)
    return <ErrorState message={overview.error} onRetry={() => void overview.reload()} />;
  if (!overview.data) return null;
  const data = overview.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Пользователи" value={data.users} icon={<Users className="h-4 w-4" />} hint={`${data.mentors} наставников, ${data.learners} учеников`} />
        <Stat label="Сессии" value={data.bookings} icon={<ShieldCheck className="h-4 w-4" />} hint={`${data.pending_bookings} ожидают`} />
        <Stat label="Миссии на проверке" value={data.missions_to_review} icon={<Target className="h-4 w-4" />} />
        <Stat label="Спорных сессий" value={data.disputed_bookings} icon={<Gavel className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Начислено баллов" value={data.points_issued} icon={<Coins className="h-4 w-4" />} />
        <Stat label="Списано баллов" value={data.points_spent} icon={<Gift className="h-4 w-4" />} />
        <Stat label="Обменов бонусов" value={data.redemptions} />
      </div>
    </div>
  );
}

function MissionsTab() {
  const pending = useAsync<PendingMission[]>(() => api.get<PendingMission[]>('/admin/missions/pending'), []);
  const [active, setActive] = useState<PendingMission | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function review() {
    if (!active) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/admin/missions/participants/${active.id}/review`, { action, note: note.trim() });
      setNotice(action === 'approve' ? 'Миссия зачтена, баллы начислены' : 'Отчёт отклонён');
      setActive(null);
      setNote('');
      await pending.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обработать заявку');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {notice && <Alert tone="success">{notice}</Alert>}
      <Card>
        <CardHeader
          title="Отчёты по миссиям"
          subtitle={`${pending.data?.length ?? 0} заявок на проверке`}
          icon={<Target className="h-4 w-4" />}
        />
        <div className="p-5">
          {pending.loading && <Spinner />}
          {pending.error && <ErrorState message={pending.error} onRetry={() => void pending.reload()} />}
          {pending.data && pending.data.length === 0 && (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="Все отчёты проверены" />
          )}
          {pending.data && pending.data.length > 0 && (
            <ul className="space-y-3">
              {pending.data.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={item.display_name} size={40} src={item.avatar_url} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{item.display_name}</p>
                          {item.is_demo === 1 && <DemoBadge />}
                        </div>
                        <p className="text-xs text-slate-500">
                          Миссия: {item.mission_title} · +{item.reward_points} баллов ·{' '}
                          {formatDateTime(item.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActive(item);
                          setAction('approve');
                          setNote('');
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Зачесть
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActive(item);
                          setAction('reject');
                          setNote('');
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Отклонить
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {item.submission_text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={action === 'approve' ? 'Зачесть миссию' : 'Отклонить отчёт'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setActive(null)}>
              Отмена
            </Button>
            <Button
              variant={action === 'approve' ? 'secondary' : 'danger'}
              onClick={review}
              loading={busy}
            >
              {action === 'approve' ? 'Зачесть и начислить' : 'Отклонить'}
            </Button>
          </>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
        {active && (
          <>
            <p className="text-sm text-slate-600">
              {action === 'approve'
                ? `Пользователю ${active.display_name} будет начислено ${active.reward_points} баллов.`
                : 'Отчёт будет отклонён, баллы не начисляются.'}
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Комментарий для пользователя (необязательно)"
            />
          </>
        )}
      </Modal>
    </div>
  );
}

function BookingsTab() {
  const [status, setStatus] = useState('disputed');
  const bookings = useAsync<AdminBooking[]>(
    () => api.get<AdminBooking[]>(`/admin/bookings?status=${status}`),
    [status]
  );
  const [active, setActive] = useState<AdminBooking | null>(null);
  const [action, setAction] = useState<'complete' | 'cancel'>('complete');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function resolve() {
    if (!active) return;
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/admin/bookings/${active.id}/resolve`, { action, note: note.trim() });
      setNotice('Решение по спору сохранено');
      setActive(null);
      setNote('');
      await bookings.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось разрешить спор');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {notice && <Alert tone="success">{notice}</Alert>}
      <div className="flex flex-wrap gap-2">
        {['disputed', 'pending', 'confirmed', 'completed', 'cancelled', ''].map((value) => (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {value ? BOOKING_STATUS_LABELS[value] : 'Все'}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Сессии"
          subtitle={`${bookings.data?.length ?? 0} записей`}
          icon={<FileWarning className="h-4 w-4" />}
        />
        <div className="overflow-x-auto p-2 sm:p-4">
          {bookings.loading && <Spinner />}
          {bookings.error && <ErrorState message={bookings.error} onRetry={() => void bookings.reload()} />}
          {bookings.data && bookings.data.length === 0 && (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="Нет сессий в этом статусе" />
          )}
          {bookings.data && bookings.data.length > 0 && (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">Тема</th>
                  <th className="px-3 py-2 font-medium">Наставник</th>
                  <th className="px-3 py-2 font-medium">Ученик</th>
                  <th className="px-3 py-2 font-medium">Время</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.data.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-800">{booking.topic}</td>
                    <td className="px-3 py-3 text-slate-600">{booking.mentor_name}</td>
                    <td className="px-3 py-3 text-slate-600">{booking.learner_name}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDateTime(booking.starts_at)}</td>
                    <td className="px-3 py-3">
                      <Badge className={BOOKING_STATUS_STYLES[booking.status]}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {booking.status === 'disputed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActive(booking);
                            setAction('complete');
                            setNote('');
                          }}
                        >
                          Разобрать
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Решение по спорной сессии"
        footer={
          <>
            <Button variant="ghost" onClick={() => setActive(null)}>
              Отмена
            </Button>
            <Button
              variant={action === 'complete' ? 'secondary' : 'danger'}
              onClick={resolve}
              loading={busy}
            >
              {action === 'complete' ? 'Завершить и начислить' : 'Отменить сессию'}
            </Button>
          </>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
        {active && (
          <>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-800">{active.topic}</p>
              <p className="mt-1 text-slate-500">
                {active.mentor_name} — {active.learner_name} · {formatDateTime(active.starts_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAction('complete')}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  action === 'complete'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                В пользу наставника
              </button>
              <button
                type="button"
                onClick={() => setAction('cancel')}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  action === 'cancel'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Отменить сессию
              </button>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Обоснование решения"
            />
          </>
        )}
      </Modal>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const users = useAsync<AdminUser[]>(
    () => api.get<AdminUser[]>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    [query]
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleBlock(user: AdminUser) {
    setBusy(user.id);
    setNotice(null);
    setError(null);
    try {
      const result = await api.patch<{
        blocked: boolean;
        cancelledBookings: number;
        freedSlots: number;
        closedMissionApplications: number;
      }>(`/admin/users/${user.id}/block`, { blocked: !user.is_blocked });

      const consequences = [
        result.cancelledBookings ? `отменено сессий: ${result.cancelledBookings}` : '',
        result.freedSlots ? `освобождено слотов: ${result.freedSlots}` : '',
        result.closedMissionApplications
          ? `закрыто заявок на миссии: ${result.closedMissionApplications}`
          : '',
      ].filter(Boolean);

      setNotice(
        `${result.blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован'}${
          consequences.length ? ` — ${consequences.join(', ')}` : ''
        }`
      );
      await users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус пользователя');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Пользователи"
        subtitle={`${users.data?.length ?? 0} записей`}
        icon={<Users className="h-4 w-4" />}
        action={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск"
              className="w-40"
              aria-label="Поиск пользователей"
            />
            <Button size="sm" type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        }
      />
      <div className="overflow-x-auto p-2 sm:p-4">
        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        {users.loading && <Spinner />}
        {users.error && <ErrorState message={users.error} onRetry={() => void users.reload()} />}
        {users.data && users.data.length === 0 && <EmptyState icon={<Users className="h-6 w-6" />} title="Пользователи не найдены" />}
        {users.data && users.data.length > 0 && (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Роль</th>
                <th className="px-3 py-2 font-medium">Город</th>
                <th className="px-3 py-2 font-medium">Баллы</th>
                <th className="px-3 py-2 font-medium">Сессии</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((user) => (
                <tr key={user.id} className="border-b border-slate-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={user.display_name} size={32} src={user.avatar_url} />
                      <span className="font-medium text-slate-800">{user.display_name}</span>
                      {user.is_demo && <DemoBadge />}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{user.email}</td>
                  <td className="px-3 py-3 text-slate-600">{ROLE_LABELS[user.role]}</td>
                  <td className="px-3 py-3 text-slate-500">{user.city || '—'}</td>
                  <td className="px-3 py-3 font-medium text-teal-700">{user.balance}</td>
                  <td className="px-3 py-3 text-slate-600">{user.sessions}</td>
                  <td className="px-3 py-3 text-right">
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant={user.is_blocked ? 'outline' : 'ghost'}
                        loading={busy === user.id}
                        onClick={() => toggleBlock(user)}
                      >
                        {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function FinanceTab() {
  const transactions = useAsync<AdminTransaction[]>(() => api.get<AdminTransaction[]>('/admin/transactions'), []);
  const redemptions = useAsync<AdminRedemption[]>(() => api.get<AdminRedemption[]>('/admin/redemptions'), []);
  const reviews = useAsync<AdminReview[]>(() => api.get<AdminReview[]>('/admin/reviews'), []);
  const [view, setView] = useState<'points' | 'redemptions' | 'reviews'>('points');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ['points', 'Журнал баллов'],
          ['redemptions', 'Обмены бонусов'],
          ['reviews', 'Отзывы'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value as typeof view)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              view === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'points' && (
        <Card>
          <CardHeader title="Журнал начислений" subtitle={`${transactions.data?.length ?? 0} операций`} icon={<Coins className="h-4 w-4" />} />
          <div className="overflow-x-auto p-2 sm:p-4">
            {transactions.loading && <Spinner />}
            {transactions.data && (
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">Пользователь</th>
                    <th className="px-3 py-2 font-medium">Тип</th>
                    <th className="px-3 py-2 font-medium">Причина</th>
                    <th className="px-3 py-2 font-medium">Дата</th>
                    <th className="px-3 py-2 text-right font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.data.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-50">
                      <td className="px-3 py-3 text-slate-700">{tx.user_name}</td>
                      <td className="px-3 py-3 text-slate-500">
                        {TRANSACTION_LABELS[tx.transaction_type] ?? tx.transaction_type}
                      </td>
                      <td className="px-3 py-3 text-slate-500">{tx.reason}</td>
                      <td className="px-3 py-3 text-slate-400">{formatDateTime(tx.created_at)}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${tx.amount > 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {view === 'redemptions' && (
        <Card>
          <CardHeader title="Обмены бонусов" subtitle={`${redemptions.data?.length ?? 0} записей`} icon={<Gift className="h-4 w-4" />} />
          <div className="overflow-x-auto p-2 sm:p-4">
            {redemptions.loading && <Spinner />}
            {redemptions.data && redemptions.data.length === 0 && (
              <EmptyState icon={<Gift className="h-6 w-6" />} title="Обменов пока нет" />
            )}
            {redemptions.data && redemptions.data.length > 0 && (
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">Пользователь</th>
                    <th className="px-3 py-2 font-medium">Бонус</th>
                    <th className="px-3 py-2 font-medium">Купон</th>
                    <th className="px-3 py-2 font-medium">Дата</th>
                    <th className="px-3 py-2 text-right font-medium">Списано</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.data.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="px-3 py-3 text-slate-700">{item.user_name}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.reward_title}
                        <span className="block text-xs text-slate-400">{item.partner_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">{item.coupon_code}</code>
                      </td>
                      <td className="px-3 py-3 text-slate-400">{formatDateTime(item.created_at)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-rose-600">−{item.points_spent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {view === 'reviews' && (
        <Card>
          <CardHeader title="Отзывы" subtitle={`${reviews.data?.length ?? 0} отзывов`} />
          <div className="p-5">
            {reviews.loading && <Spinner />}
            {reviews.data && reviews.data.length === 0 && <EmptyState icon={<Gift className="h-6 w-6" />} title="Отзывов пока нет" />}
            {reviews.data && reviews.data.length > 0 && (
              <ul className="space-y-3">
                {reviews.data.map((review) => (
                  <li key={review.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        {review.learner_name} → {review.mentor_name}
                      </span>
                      <Badge className="bg-amber-50 text-amber-700 ring-amber-200">{review.rating} / 5</Badge>
                    </div>
                    {review.text && <p className="mt-2 text-sm text-slate-600">{review.text}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(review.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

const AUDIT_LABELS: Record<string, string> = {
  user_blocked: 'Пользователь заблокирован',
  user_unblocked: 'Пользователь разблокирован',
  booking_completed: 'Сессия завершена администратором',
  booking_cancelled: 'Сессия отменена администратором',
  mission_approved: 'Миссия зачтена',
  mission_rejected: 'Миссия отклонена',
};

function AuditTab() {
  const audit = useAsync<AdminAudit[]>(() => api.get<AdminAudit[]>('/admin/audit'), []);

  return (
    <Card>
      <CardHeader
        title="Журнал действий администраторов"
        subtitle={`${audit.data?.length ?? 0} записей`}
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <div className="p-5">
        {audit.loading && <Spinner />}
        {audit.error && <ErrorState message={audit.error} onRetry={() => void audit.reload()} />}
        {audit.data && audit.data.length === 0 && (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Действий пока не было" />
        )}
        {audit.data && audit.data.length > 0 && (
          <ul className="space-y-3">
            {audit.data.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {AUDIT_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="text-xs text-slate-500">{entry.details}</p>
                  <p className="text-xs text-slate-400">
                    {entry.admin_name} · {formatDateTime(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
