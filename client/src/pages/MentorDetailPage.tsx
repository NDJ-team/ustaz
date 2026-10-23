import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  MessageSquare,
  Star,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/lib/auth';
import { useMeta } from '@/lib/useMeta';
import type { MentorDetail, Slot } from '@/lib/types';
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
  Spinner,
  Textarea,
} from '@/components/ui';
import {
  formatDate,
  formatDateTime,
  formatDayLabel,
  formatFullDate,
  formatTime,
  pluralize,
} from '@/lib/format';

const PREVIEW_REVIEWS = 4;
const TOPIC_MAX = 200;
const NOTE_MAX = 600;

/** Группирует слоты по дню. */
function groupSlots(slots: Slot[]): Array<{ day: string; items: Slot[] }> {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = new Date(slot.starts_at).toDateString();
    const list = map.get(key) ?? [];
    list.push(slot);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([, items]) => ({
    day: items[0].starts_at,
    items,
  }));
}

export function MentorDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { me, refresh } = useAuth();
  const { meta } = useMeta();

  const mentor = useAsync<MentorDetail>(() => api.get<MentorDetail>(`/mentors/${id}`), [id]);
  const categoryLabels = useMemo(
    () => new Map((meta?.categories ?? []).map((item) => [item.id, item.label])),
    [meta]
  );

  const [selected, setSelected] = useState<Slot | null>(null);
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const groups = useMemo(
    () => (mentor.data ? groupSlots(mentor.data.slots) : []),
    [mentor.data]
  );

  const isSelf = me?.profile.id === id;
  const canBook = me?.profile.role === 'learner' && !isSelf;
  const mentorId = mentor.data?.id;

  // Переход из каталога «Выбрать время» сразу к расписанию.
  useEffect(() => {
    if (location.hash !== '#slots' || !mentorId) return;
    const node = document.getElementById('slots');
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, mentorId]);

  async function book() {
    if (!selected) return;
    setError(null);
    if (topic.trim().length < 5) {
      setError('Опишите тему консультации (минимум 5 символов)');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await api.post<{ id: string }>('/bookings', {
        mentor_id: id,
        slot_id: selected.id,
        topic: topic.trim(),
        note: note.trim(),
      });
      await refresh();
      navigate(`/app/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось забронировать слот');
    } finally {
      setSubmitting(false);
    }
  }

  if (mentor.loading) return <Spinner />;
  if (mentor.error)
    return <ErrorState message={mentor.error} onRetry={() => void mentor.reload()} />;
  if (!mentor.data) return null;

  const data = mentor.data;
  const rating = data.stats.rating;
  const reviewsCount = data.stats.reviews_count;
  const slotsCount = data.slots.length;
  const nextSlot = data.slots[0]?.starts_at ?? null;
  const visibleReviews = showAllReviews
    ? data.reviews
    : data.reviews.slice(0, PREVIEW_REVIEWS);
  const skillLabels = data.skills.map((skill) => categoryLabels.get(skill) ?? skill);

  return (
    <div className="space-y-6">
      <Link
        to="/app/mentors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        К каталогу наставников
      </Link>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/50 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={data.display_name} size={80} src={data.avatar_url} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {data.display_name}
                  </h1>
                  {data.is_demo && <DemoBadge />}
                </div>
                <p className="mt-1 text-slate-600">{data.headline || 'Наставник USTAZ'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  {data.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {data.city}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-4 w-4" />
                    на платформе с {formatFullDate(data.created_at)}
                  </span>
                </div>
                {skillLabels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skillLabels.map((skill) => (
                      <Badge
                        key={skill}
                        className="bg-indigo-50 text-indigo-700 ring-indigo-200"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white/80 p-4 text-center">
              <div className="px-3">
                <p className="flex items-center justify-center gap-1 text-2xl font-bold text-slate-900">
                  {rating !== null ? (
                    <>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {rating}
                    </>
                  ) : (
                    <span className="text-lg">Новый</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {reviewsCount > 0
                    ? `${reviewsCount} ${pluralize(
                        reviewsCount,
                        'отзыв',
                        'отзыва',
                        'отзывов'
                      )}`
                    : 'без отзывов'}
                </p>
              </div>
              <div className="px-3">
                <p className="text-2xl font-bold text-slate-900">
                  {data.stats.sessions_count}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {pluralize(
                    data.stats.sessions_count,
                    'сессия',
                    'сессии',
                    'сессий'
                  )}
                </p>
              </div>
              <div className="px-3">
                <p className="text-2xl font-bold text-teal-700">{slotsCount}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {pluralize(slotsCount, 'слот', 'слота', 'слотов')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">О наставнике</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {data.bio || 'Наставник пока не добавил описание.'}
            </p>

            {data.interests.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Интересы
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.interests.map((interest) => (
                    <Badge
                      key={interest}
                      className="bg-slate-100 text-slate-600 ring-slate-200"
                    >
                      {categoryLabels.get(interest) ?? interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Детали
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <dt className="text-xs text-slate-500">Город</dt>
                  <dd className="font-medium text-slate-800">{data.city || 'Не указан'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarPlus className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <dt className="text-xs text-slate-500">Ближайшее окно</dt>
                  <dd className="font-medium text-slate-800">
                    {nextSlot ? formatDateTime(nextSlot) : 'Нет свободных слотов'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <dt className="text-xs text-slate-500">На платформе</dt>
                  <dd className="font-medium text-slate-800">
                    с {formatFullDate(data.created_at)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div id="slots" className="scroll-mt-6 xl:col-start-1 xl:row-start-1">
          <Card>
            <CardHeader
              title="Свободное время"
              subtitle={
                slotsCount > 0
                  ? `${slotsCount} ${pluralize(
                      slotsCount,
                      'слот',
                      'слота',
                      'слотов'
                    )} · выберите удобное время`
                  : 'Расписание наставника'
              }
              icon={<CalendarPlus className="h-4 w-4" />}
            />
            <div className="p-5">
              {!canBook && (
                <Alert tone="info">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {isSelf
                        ? 'Это ваш профиль. Записаться к самому себе нельзя.'
                        : 'Бронировать сессии могут только ученики.'}
                    </span>
                    {isSelf && (
                      <Link to="/app/schedule">
                        <Button size="sm" variant="outline">
                          Управлять расписанием
                        </Button>
                      </Link>
                    )}
                  </div>
                </Alert>
              )}

              {slotsCount === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={<CalendarClock className="h-6 w-6" />}
                    title="Нет свободных слотов"
                    description="Наставник ещё не добавил доступное время. Загляните позже."
                  />
                </div>
              ) : (
                <div className={canBook ? 'mt-1 space-y-5' : 'mt-5 space-y-5'}>
                  {groups.map((group) => {
                    const dayLabel = formatDayLabel(group.day);
                    const dateLabel = formatDate(group.day);
                    return (
                      <div key={group.day}>
                        <p className="text-sm font-semibold text-slate-800">
                          {dayLabel}
                          {dayLabel !== dateLabel && (
                            <span className="ml-2 font-normal text-slate-400">
                              {dateLabel}
                            </span>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.items.map((slot) => {
                          const active = selected?.id === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!canBook}
                              aria-pressed={active}
                              onClick={() => {
                                setSelected(slot);
                                setError(null);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                active
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                              }`}
                            >
                              {active && <Check className="h-3.5 w-3.5" />}
                              {formatTime(slot.starts_at)}
                            </button>
                          );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {canBook && slotsCount > 0 && (
          <Card className="p-5 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1 xl:self-start">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Запись на сессию</h2>
                <p className="text-xs text-slate-500">Наставник подтвердит заявку</p>
              </div>
            </div>

            {selected ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-indigo-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-indigo-800">
                        {formatDayLabel(selected.starts_at)}, {formatTime(selected.starts_at)} —{' '}
                        {formatTime(selected.ends_at)}
                      </p>
                      <p className="mt-0.5 text-xs text-indigo-600">
                        {formatFullDate(selected.starts_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                    >
                      Изменить
                    </button>
                  </div>
                </div>

                <Field
                  label="Тема консультации"
                  htmlFor="topic"
                  hint={`Минимум 5 символов · ${topic.length}/${TOPIC_MAX}`}
                >
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    maxLength={TOPIC_MAX}
                    placeholder="Например: разбор первого React-проекта, помогите с хуками"
                  />
                </Field>

                <Field
                  label="Комментарий"
                  htmlFor="note"
                  hint={`Необязательно · ${note.length}/${NOTE_MAX}`}
                >
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={NOTE_MAX}
                    placeholder="Что уже пробовали, какие есть материалы"
                    className="min-h-[72px]"
                  />
                </Field>

                {error && <Alert tone="error">{error}</Alert>}

                <Button
                  className="w-full"
                  loading={submitting}
                  disabled={topic.trim().length < 5}
                  onClick={() => void book()}
                >
                  Отправить заявку
                </Button>
                <p className="text-center text-xs leading-relaxed text-slate-500">
                  Баллы не списываются. Наставник сначала подтвердит время.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  Выберите время в расписании — после этого здесь появится форма заявки.
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() =>
                    document
                      .getElementById('slots')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  <CalendarPlus className="h-4 w-4" />
                  Выбрать время
                </Button>
              </div>
            )}
          </Card>
        )}

        <Card className="xl:col-start-1 xl:row-start-2">
          <CardHeader
            title="Отзывы"
            subtitle={
              reviewsCount === 0
                ? 'Пока без отзывов'
                : `${reviewsCount} ${pluralize(
                    reviewsCount,
                    'отзыв',
                    'отзыва',
                    'отзывов'
                  )}${rating !== null ? ` · средняя оценка ${rating}` : ''}`
            }
            icon={<Star className="h-4 w-4" />}
          />
          <div className="p-5">
            {data.reviews.length === 0 ? (
              <EmptyState
                icon={<Star className="h-5 w-5" />}
                title="Отзывов пока нет"
                description="После завершённой сессии ученик сможет оставить отзыв."
              />
            ) : (
              <>
                <ul className="space-y-3">
                  {visibleReviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={review.learner.display_name}
                            size={36}
                            src={review.learner.avatar_url}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {review.learner.display_name}
                            </p>
                            <div
                              className="mt-0.5 flex items-center gap-0.5"
                              aria-label={`Оценка ${review.rating} из 5`}
                            >
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={index}
                                  className={`h-3.5 w-3.5 ${
                                    index < review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                      {review.text && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {review.text}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                {data.reviews.length > PREVIEW_REVIEWS && (
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllReviews((value) => !value)}
                  >
                    {showAllReviews
                      ? 'Свернуть отзывы'
                      : `Показать ещё ${data.reviews.length - PREVIEW_REVIEWS}`}
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
