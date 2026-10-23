import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coins,
  Gift,
  Star,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useToast } from '@/components/Toast';
import { announceNotificationsChanged } from '@/lib/notifications';
import type { AppNotification, NotificationList } from '@/lib/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, formatFullDate } from '@/lib/format';

type Filter = 'all' | 'unread';

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Ранее';
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return formatFullDate(iso);
}

function groupByDay(items: AppNotification[]) {
  const groups: Array<{ key: string; label: string; items: AppNotification[] }> = [];
  for (const item of items) {
    const key = dayLabel(item.created_at);
    const group = groups.find((entry) => entry.key === key);
    if (group) group.items.push(item);
    else groups.push({ key, label: key, items: [item] });
  }
  return groups;
}

function notificationMeta(type: string) {
  switch (type) {
    case 'booking_created':
      return { Icon: CalendarPlus, tone: 'bg-indigo-50 text-indigo-600' };
    case 'booking_confirmed':
      return { Icon: CalendarCheck2, tone: 'bg-teal-50 text-teal-600' };
    case 'booking_completion_requested':
      return { Icon: CalendarClock, tone: 'bg-amber-50 text-amber-600' };
    case 'booking_completed':
      return { Icon: CheckCircle2, tone: 'bg-teal-50 text-teal-600' };
    case 'booking_cancelled':
      return { Icon: XCircle, tone: 'bg-rose-50 text-rose-600' };
    case 'booking_disputed':
    case 'dispute_created':
      return { Icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' };
    case 'review_received':
      return { Icon: Star, tone: 'bg-amber-50 text-amber-600' };
    case 'mission_submitted':
      return { Icon: ClipboardCheck, tone: 'bg-indigo-50 text-indigo-600' };
    case 'mission_approved':
      return { Icon: CheckCircle2, tone: 'bg-teal-50 text-teal-600' };
    case 'mission_rejected':
      return { Icon: XCircle, tone: 'bg-rose-50 text-rose-600' };
    case 'points_awarded':
    case 'points_earned':
      return { Icon: Coins, tone: 'bg-teal-50 text-teal-600' };
    case 'referral_bonus':
      return { Icon: Gift, tone: 'bg-amber-50 text-amber-600' };
    default:
      return { Icon: Bell, tone: 'bg-slate-100 text-slate-500' };
  }
}

function NotificationSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </Card>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useAsync<NotificationList>(() => api.get<NotificationList>('/notifications?limit=50'), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function markAll() {
    setBusy(true);
    setActionError(null);
    try {
      await api.patch('/notifications/read-all');
      announceNotificationsChanged();
      await list.reload();
      toast.success('Все уведомления прочитаны');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось отметить уведомления';
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function openNotification(item: AppNotification) {
    setActionError(null);

    if (!item.is_read) {
      try {
        await api.patch(`/notifications/${item.id}/read`);
        const current = list.data;
        if (current) {
          list.setData({
            unread: Math.max(0, current.unread - 1),
            items: current.items.map((entry) =>
              entry.id === item.id ? { ...entry, is_read: true } : entry
            ),
          });
        }
        announceNotificationsChanged();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось открыть уведомление';
        setActionError(message);
        toast.error(message);
        return;
      }
    }

    if (item.link) {
      navigate(item.link);
      return;
    }
    await list.reload();
  }

  if (list.loading && !list.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Уведомления"
          description="Подтверждения сессий, результаты миссий и ответы администратора — в одном месте."
        />
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <NotificationSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (list.error) {
    return <ErrorState message={list.error} onRetry={() => void list.reload()} />;
  }

  const data = list.data ?? { unread: 0, items: [] };
  const visible = filter === 'unread' ? data.items.filter((item) => !item.is_read) : data.items;
  const groups = groupByDay(visible);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Уведомления"
        description="Подтверждения сессий, результаты миссий и ответы администратора — в одном месте."
        action={
          data.unread > 0 ? (
            <Button variant="outline" onClick={markAll} loading={busy}>
              <CheckCheck className="h-4 w-4" />
              Прочитать все
            </Button>
          ) : undefined
        }
      />

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {data.items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: 'all', label: 'Все', count: data.items.length },
              { id: 'unread', label: 'Непрочитанные', count: data.unread },
            ]}
          />
          <p className="text-sm text-slate-500">
            Непрочитанных: <span className="font-semibold text-slate-900">{data.unread}</span>
          </p>
        </div>
      )}

      {data.items.length === 0 && (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Пока нет уведомлений"
          description="Здесь появятся подтверждения сессий, результаты миссий и ответы администратора."
        />
      )}

      {data.items.length > 0 && visible.length === 0 && (
        <EmptyState
          icon={<CheckCheck className="h-6 w-6" />}
          title="Все уведомления прочитаны"
          description="Новые события появятся здесь автоматически."
          action={
            <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
              Показать все
            </Button>
          }
        />
      )}

      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </h2>
            <span className="text-xs text-slate-400">{group.items.length}</span>
          </div>
          <div className="space-y-3">
            {group.items.map((item) => {
              const { Icon, tone } = notificationMeta(item.type);
              return (
                <Card
                  key={item.id}
                  className={`p-4 transition-colors ${
                    item.is_read ? '' : 'border-indigo-200 bg-indigo-50/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openNotification(item)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                        {!item.is_read && (
                          <Badge className="bg-indigo-600 text-white ring-indigo-600">Новое</Badge>
                        )}
                      </span>
                      {item.body && (
                        <span className="mt-0.5 block text-sm text-slate-600">{item.body}</span>
                      )}
                      <span className="mt-1 block text-xs text-slate-400">
                        {formatDateTime(item.created_at)}
                      </span>
                    </span>

                    {item.link && (
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">
        В MVP уведомления показываются внутри платформы. Email и push-рассылки не подключены.
      </p>
    </div>
  );
}
