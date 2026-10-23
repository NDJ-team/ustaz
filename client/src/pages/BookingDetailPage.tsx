import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Star,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/lib/auth';
import type { Booking } from '@/lib/types';
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
  Field,
  Modal,
  Spinner,
  Textarea,
} from '@/components/ui';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatDate,
  formatDateTime,
  formatFullDate,
  formatTime,
  pluralize,
} from '@/lib/format';

type DestructiveAction = 'cancel' | 'dispute';

interface CompleteResult {
  booking: Booking;
  awarded: boolean;
  points: number;
}

interface TimelineEvent {
  title: string;
  at?: string | null;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const EVENT_TONES: Record<NonNullable<TimelineEvent['tone']>, string> = {
  default: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  success: 'bg-teal-50 text-teal-600 ring-teal-100',
  warning: 'bg-amber-50 text-amber-600 ring-amber-100',
  danger: 'bg-rose-50 text-rose-600 ring-rose-100',
};

function ActionPanelShell({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Что дальше
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function eventIcon(tone: NonNullable<TimelineEvent['tone']>) {
  if (tone === 'danger') return <AlertTriangle className="h-4 w-4" />;
  if (tone === 'success') return <Check className="h-4 w-4" />;
  if (tone === 'warning') return <Clock className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function BookingDetailPage() {
  const { id = '' } = useParams();
  const { refresh } = useAuth();

  const booking = useAsync<Booking>(() => api.get<Booking>(`/bookings/${id}`), [id]);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<DestructiveAction | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  async function act<T>(
    key: string,
    action: () => Promise<T>,
    successMessage?: string | ((result: T) => string)
  ): Promise<T | null> {
    setError(null);
    setNotice(null);
    setBusy(key);
    try {
      const result = await action();
      await booking.reload();
      await refresh();
      if (successMessage) {
        setNotice(
          typeof successMessage === 'function' ? successMessage(result) : successMessage
        );
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Действие не выполнено');
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (booking.loading) return <Spinner />;
  if (booking.error)
    return <ErrorState message={booking.error} onRetry={() => void booking.reload()} />;
  if (!booking.data) return null;

  const data = booking.data;
  const isMentor = data.viewer_role === 'mentor';
  const counterpart = isMentor ? data.learner : data.mentor;
  const isConfirmed =
    data.status === 'confirmed' ||
    data.status === 'completed' ||
    data.status === 'disputed';
  const myCompletion = isMentor
    ? data.mentor_confirmed_at
    : data.learner_confirmed_at;
  const otherCompletion = isMentor
    ? data.learner_confirmed_at
    : data.mentor_confirmed_at;

  const duration = Math.max(
    0,
    Math.round(
      (new Date(data.slot.ends_at).getTime() - new Date(data.slot.starts_at).getTime()) /
        60000
    )
  );

  const confirm = () =>
    void act(
      'confirm',
      () => api.patch<Booking>(`/bookings/${data.id}/confirm`),
      'Заявка подтверждена. Ученик получил уведомление.'
    );

  const complete = () =>
    void act(
      'complete',
      () => api.post<CompleteResult>(`/bookings/${data.id}/complete`),
      (result) => {
        if (result.booking.status === 'completed') {
          return result.awarded
            ? `Сессия завершена. ${isMentor ? 'Вам' : 'Наставнику'} начислено ${
                result.points
              } ${pluralize(result.points, 'балл', 'балла', 'баллов')}.`
            : 'Сессия завершена.';
        }
        return 'Отметка сохранена. Ожидаем подтверждения второй стороны.';
      }
    );

  const runDestructive = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    const result = await act(
      action,
      () => api.post<Booking>(`/bookings/${data.id}/${action}`),
      action === 'cancel'
        ? 'Сессия отменена. Вторая сторона получила уведомление.'
        : 'Спор открыт. Администратор получил уведомление.'
    );
    if (result) setConfirmAction(null);
  };

  async function submitReview() {
    const result = await act(
      'review',
      () =>
        api.post<Booking>(`/bookings/${data.id}/review`, {
          rating,
          text: reviewText.trim(),
        }),
      'Спасибо за отзыв!'
    );
    if (result) setReviewOpen(false);
  }

  const steps = [
    {
      label: 'Заявка',
      hint: formatDate(data.created_at),
      done: true,
      active: false,
      danger: false,
    },
    {
      label: 'Подтверждение',
      hint: isConfirmed ? 'Получено' : data.status === 'pending' ? 'Ожидается' : 'Не получено',
      done: isConfirmed,
      active: data.status === 'pending',
      danger: false,
    },
    {
      label: 'Встреча',
      hint: formatDate(data.slot.starts_at),
      done: data.status === 'completed',
      active: data.status === 'confirmed',
      danger: false,
    },
    {
      label: 'Завершение',
      hint:
        data.status === 'completed'
          ? 'Завершена'
          : data.status === 'cancelled'
            ? 'Отменена'
            : data.status === 'disputed'
              ? 'Открыт спор'
              : 'После встречи',
      done: data.status === 'completed',
      active: false,
      danger: data.status === 'cancelled' || data.status === 'disputed',
    },
  ];
  const completedSteps = steps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  const completionMarks = [
    { title: 'Ученик отметил завершение', at: data.learner_confirmed_at },
    { title: 'Наставник отметил завершение', at: data.mentor_confirmed_at },
  ]
    .filter((mark): mark is { title: string; at: string } => Boolean(mark.at))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const completedAt =
    completionMarks.length > 0 ? completionMarks[completionMarks.length - 1].at : null;

  const timeline: TimelineEvent[] = [{ title: 'Заявка создана', at: data.created_at }];

  if (isConfirmed) {
    timeline.push({ title: 'Наставник подтвердил заявку', tone: 'success' });
  }
  if (data.status === 'pending') {
    timeline.push({
      title: 'Ожидает подтверждения наставника',
      description: isMentor
        ? 'Подтвердите заявку или отклоните её, чтобы ученик получил ответ.'
        : 'Наставник получил уведомление о новой заявке.',
      tone: 'warning',
    });
  }
  for (const mark of completionMarks) {
    timeline.push({ title: mark.title, at: mark.at, tone: 'success' });
  }
  if (data.status === 'completed') {
    timeline.push({
      title: 'Сессия завершена',
      at: completedAt,
      description: 'Обе стороны подтвердили, что встреча состоялась.',
      tone: 'success',
    });
  }
  if (data.status === 'cancelled') {
    timeline.push({
      title: 'Сессия отменена',
      at: data.updated_at,
      description: 'Вторая сторона получила уведомление об отмене.',
      tone: 'danger',
    });
  }
  if (data.status === 'disputed') {
    timeline.push({
      title: 'Открыт спор',
      at: data.updated_at,
      description: 'Администратор рассмотрит ситуацию и свяжется с участниками.',
      tone: 'danger',
    });
  }

  function actionPanel() {
    if (data.status === 'pending' && isMentor) {
      return (
        <ActionPanelShell
          title="Новая заявка"
          text="Подтвердите время или отклоните заявку. Ученик получит уведомление о решении."
        >
          <Button className="w-full" onClick={confirm} loading={busy === 'confirm'}>
            <Check className="h-4 w-4" />
            Подтвердить заявку
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setConfirmAction('cancel')}
          >
            <X className="h-4 w-4" />
            Отклонить заявку
          </Button>
        </ActionPanelShell>
      );
    }

    if (data.status === 'pending') {
      return (
        <ActionPanelShell
          title="Ждём ответа наставника"
          text={`${data.mentor.display_name} проверит заявку и подтвердит время. Вы получите уведомление.`}
        >
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setConfirmAction('cancel')}
          >
            <X className="h-4 w-4" />
            Отменить заявку
          </Button>
        </ActionPanelShell>
      );
    }

    if (data.status === 'confirmed') {
      if (myCompletion) {
        return (
          <ActionPanelShell
            title="Вы отметили завершение"
            text={`Осталось подтверждение от ${counterpart.display_name}. После этого сессия закроется, а наставнику начислятся баллы.`}
          >
            <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Ваша отметка сохранена
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setConfirmAction('cancel')}
            >
              Отменить сессию
            </Button>
          </ActionPanelShell>
        );
      }

      return (
        <ActionPanelShell
          title={otherCompletion ? 'Подтвердите завершение' : 'Встреча подтверждена'}
          text={
            otherCompletion
              ? `${counterpart.display_name} уже отметил(а), что встреча состоялась. Подтвердите, чтобы закрыть сессию и начислить баллы.`
              : 'После встречи отметьте завершение. Сессия закроется, когда обе стороны подтвердят, что она состоялась.'
          }
        >
          <Button className="w-full" variant="secondary" onClick={complete} loading={busy === 'complete'}>
            <CheckCircle2 className="h-4 w-4" />
            {otherCompletion ? 'Подтвердить завершение' : 'Отметить завершение'}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setConfirmAction('cancel')}
          >
            Отменить сессию
          </Button>
          {!otherCompletion && (
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => setConfirmAction('dispute')}
            >
              <AlertTriangle className="h-4 w-4" />
              Открыть спор
            </Button>
          )}
        </ActionPanelShell>
      );
    }

    if (data.status === 'completed') {
      return (
        <ActionPanelShell
          title="Сессия завершена"
          text={
            data.can_review
              ? 'Поделитесь впечатлением о встрече — отзыв поможет другим ученикам выбрать наставника.'
              : data.review
                ? 'Спасибо за встречу! Отзыв уже оставлен.'
                : isMentor
                  ? 'Спасибо за встречу! Баллы за сессию начислены.'
                  : 'Спасибо за встречу!'
          }
        >
          {data.can_review && (
            <Button className="w-full" variant="secondary" onClick={() => setReviewOpen(true)}>
              <Star className="h-4 w-4" />
              Оставить отзыв
            </Button>
          )}
          <Link to="/app/bookings" className="block">
            <Button className="w-full" variant="outline">
              К списку сессий
            </Button>
          </Link>
        </ActionPanelShell>
      );
    }

    if (data.status === 'disputed') {
      return (
        <ActionPanelShell
          title="Идёт разбор спора"
          text="Действия по сессии временно недоступны. Администратор рассмотрит ситуацию и сообщит о решении."
        >
          <Link to="/app/notifications" className="block">
            <Button className="w-full" variant="outline">
              Проверить уведомления
            </Button>
          </Link>
        </ActionPanelShell>
      );
    }

    return (
      <ActionPanelShell
        title="Сессия отменена"
        text="Действия по этой сессии недоступны. Можно выбрать другое время или другого наставника."
      >
        <Link to={isMentor ? '/app/schedule' : '/app/mentors'} className="block">
          <Button className="w-full" variant="outline">
            {isMentor ? 'Открыть расписание' : 'Найти наставника'}
          </Button>
        </Link>
      </ActionPanelShell>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/bookings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        К списку сессий
      </Link>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/50 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={BOOKING_STATUS_STYLES[data.status]}>
              {BOOKING_STATUS_LABELS[data.status]}
            </Badge>
            <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
              Вы {isMentor ? 'наставник' : 'ученик'}
            </Badge>
            {data.mentor.is_demo && <DemoBadge />}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {data.topic}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Заявка создана {formatDateTime(data.created_at)}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              {formatFullDate(data.slot.starts_at)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
              <Clock className="h-4 w-4 text-indigo-500" />
              {formatTime(data.slot.starts_at)} — {formatTime(data.slot.ends_at)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
              <Clock className="h-4 w-4 text-teal-500" />
              {duration} {pluralize(duration, 'минута', 'минуты', 'минут')}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isMentor ? 'Ученик' : 'Наставник'}
              </p>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Avatar
                  name={counterpart.display_name}
                  size={48}
                  src={counterpart.avatar_url}
                />
                <div className="min-w-0 flex-1">
                  {isMentor ? (
                    <p className="truncate font-semibold text-slate-900">
                      {counterpart.display_name}
                    </p>
                  ) : (
                    <Link
                      to={`/app/mentors/${data.mentor.id}`}
                      className="inline-flex min-w-0 items-center gap-1 font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      <span className="truncate">{counterpart.display_name}</span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </Link>
                  )}
                  <p className="truncate text-xs text-slate-500">
                    {isMentor
                      ? counterpart.city || 'Ученик'
                      : [data.mentor.headline, data.mentor.city].filter(Boolean).join(' · ') ||
                        'Наставник'}
                  </p>
                </div>
              </div>
            </div>

            {data.note && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Комментарий к заявке</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {data.note}
                </p>
              </div>
            )}
          </div>

          {actionPanel()}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Этапы сессии</h2>
          <span className="text-xs font-medium text-slate-500">
            {completedSteps} из {steps.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.label} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ${
                  step.done
                    ? 'bg-teal-50 text-teal-600 ring-teal-100'
                    : step.danger
                      ? 'bg-rose-50 text-rose-600 ring-rose-100'
                      : step.active
                        ? 'bg-indigo-50 text-indigo-600 ring-indigo-200'
                        : 'bg-slate-50 text-slate-400 ring-slate-100'
                }`}
              >
                {step.done ? (
                  <Check className="h-4 w-4" />
                ) : step.danger ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.done
                      ? 'text-slate-900'
                      : step.danger
                        ? 'text-rose-700'
                        : step.active
                          ? 'text-indigo-700'
                          : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{step.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader
            title="Ход сессии"
            subtitle="Ключевые события от заявки до завершения"
            icon={<Clock className="h-4 w-4" />}
          />
          <div className="p-5">
            <ol>
              {timeline.map((event, index) => {
                const tone = event.tone ?? 'default';
                return (
                  <li key={`${event.title}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < timeline.length - 1 && (
                      <span className="absolute left-4 top-9 h-[calc(100%-1.75rem)] w-px bg-slate-200" />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${EVENT_TONES[tone]}`}
                    >
                      {eventIcon(tone)}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p
                          className={`text-sm font-medium ${
                            tone === 'danger' ? 'text-rose-700' : 'text-slate-800'
                          }`}
                        >
                          {event.title}
                        </p>
                        {event.at && (
                          <span className="text-xs text-slate-400">
                            {formatDateTime(event.at)}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Отзыв"
            subtitle="Доступен после завершения сессии"
            icon={<Star className="h-4 w-4" />}
          />
          <div className="p-5">
            {data.review ? (
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${
                        index < (data.review?.rating ?? 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {data.review.text && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {data.review.text}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {formatFullDate(data.review.created_at)}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={<Star className="h-5 w-5" />}
                title="Отзыва пока нет"
                description={
                  data.can_review
                    ? 'Поделитесь впечатлением — это поможет другим ученикам.'
                    : 'Отзыв может оставить ученик после завершения сессии.'
                }
                action={
                  data.can_review ? (
                    <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
                      Оставить отзыв
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'dispute' ? 'Открыть спор?' : 'Отменить сессию?'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              Назад
            </Button>
            <Button
              variant="danger"
              onClick={() => void runDestructive()}
              loading={busy === confirmAction}
            >
              {confirmAction === 'dispute' ? 'Открыть спор' : 'Отменить сессию'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          {confirmAction === 'dispute'
            ? 'Сессия получит статус «Спор», действия по ней будут приостановлены. Администратор рассмотрит ситуацию и свяжется с участниками.'
            : data.status === 'pending' && isMentor
              ? 'Заявка будет отклонена, слот снова станет доступным для записи. Ученик получит уведомление.'
              : 'Сессия будет отменена, вторая сторона получит уведомление. Если время ещё не прошло, слот освободится для новой записи.'}
        </p>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">{data.topic}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatFullDate(data.slot.starts_at)} · {formatTime(data.slot.starts_at)} —{' '}
            {formatTime(data.slot.ends_at)}
          </p>
        </div>
      </Modal>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Отзыв о сессии"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submitReview()} loading={busy === 'review'}>
              Отправить
            </Button>
          </>
        }
      >
        <Field label="Оценка">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} из 5`}
                className="p-1"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Комментарий" hint="Необязательно">
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Что было полезно, что можно улучшить"
          />
        </Field>
      </Modal>
    </div>
  );
}
