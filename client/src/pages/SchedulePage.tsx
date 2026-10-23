import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Clock,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import type { BulkSlotResult, MySlot } from '@/lib/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  formatDate,
  formatDateTime,
  formatDayLabel,
  formatTime,
  pluralize,
} from '@/lib/format';

const SLOT_STATUS_LABELS: Record<string, string> = {
  available: 'Свободен',
  booked: 'Забронирован',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const SLOT_STATUS_STYLES: Record<string, string> = {
  available: 'bg-teal-50 text-teal-700 ring-teal-200',
  booked: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  completed: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
};

type SlotFilter = 'all' | 'available' | 'booked';

const FILTERS: Array<{ id: SlotFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'available', label: 'Свободные' },
  { id: 'booked', label: 'С занятием' },
];

/** Переводит дату в значение для input[type=datetime-local] без сдвига часового пояса. */
function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

/** Возвращает ISO-строку для поля datetime-local, минимум +1 час. */
function defaultStart(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date);
}

/** Завтрашняя дата для массового создания (локально, YYYY-MM-DD). */
function defaultBulkDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
] as const;

/**
 * Разворачивает правило «каждый выбранный день недели, N недель подряд»
 * в конкретные локальные даты. Дальше сервер ещё раз проверяет каждую дату.
 */
function buildOccurrences(
  date: string,
  time: string,
  weekdays: number[],
  weeks: number
): Date[] {
  if (!date || !time || weekdays.length === 0) return [];
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return [];

  const earliest = Date.now() + 10 * 60 * 1000;
  const latest = Date.now() + 90 * 24 * 60 * 60 * 1000;
  const result: Date[] = [];

  for (let index = 0; index < weeks * 7; index += 1) {
    const current = new Date(year, month - 1, day + index, hours, minutes, 0, 0);
    const isoWeekday = current.getDay() === 0 ? 7 : current.getDay();
    if (!weekdays.includes(isoWeekday)) continue;
    const timestamp = current.getTime();
    if (timestamp < earliest || timestamp > latest) continue;
    result.push(current);
  }

  return result;
}

function groupByDay(slots: MySlot[]): Array<{ day: string; items: MySlot[] }> {
  const map = new Map<string, MySlot[]>();
  for (const slot of slots) {
    const key = new Date(slot.starts_at).toDateString();
    const list = map.get(key) ?? [];
    list.push(slot);
    map.set(key, list);
  }
  return Array.from(map.values()).map((items) => ({
    day: items[0].starts_at,
    items,
  }));
}

export function SchedulePage() {
  const slots = useAsync<MySlot[]>(() => api.get<MySlot[]>('/my-slots'), []);
  const [startsAt, setStartsAt] = useState(defaultStart());
  const [duration, setDuration] = useState(45);
  const [addBusy, setAddBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<SlotFilter>('all');
  const [slotToDelete, setSlotToDelete] = useState<MySlot | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(defaultBulkDate);
  const [bulkTime, setBulkTime] = useState('18:00');
  const [bulkDuration, setBulkDuration] = useState(45);
  const [bulkWeeks, setBulkWeeks] = useState(4);
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([2]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkWarning, setBulkWarning] = useState<string | null>(null);

  const bulkOccurrences = buildOccurrences(bulkDate, bulkTime, bulkWeekdays, bulkWeeks);
  const minStart = toLocalInput(new Date(Date.now() + 10 * 60 * 1000));
  const maxStart = toLocalInput(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const rows = slots.data ?? [];
    return {
      upcoming: rows
        .filter((slot) => new Date(slot.starts_at).getTime() >= now)
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        ),
      past: rows
        .filter((slot) => new Date(slot.starts_at).getTime() < now)
        .sort(
          (a, b) =>
            new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
        ),
    };
  }, [slots.data]);

  const availableCount = upcoming.filter((slot) => slot.status === 'available').length;
  const bookedCount = upcoming.length - availableCount;
  const nextAvailable = upcoming.find((slot) => slot.status === 'available') ?? null;

  const filteredUpcoming = useMemo(() => {
    if (filter === 'all') return upcoming;
    if (filter === 'available') {
      return upcoming.filter((slot) => slot.status === 'available');
    }
    return upcoming.filter((slot) => slot.status !== 'available');
  }, [upcoming, filter]);

  const groups = useMemo(() => groupByDay(filteredUpcoming), [filteredUpcoming]);
  const visiblePast = showAllPast ? past : past.slice(0, 6);

  function toggleWeekday(value: number) {
    setBulkWeekdays((previous) =>
      previous.includes(value)
        ? previous.filter((day) => day !== value)
        : [...previous, value].sort((a, b) => a - b)
    );
  }

  async function addSlot() {
    setError(null);
    setNotice(null);
    setBulkWarning(null);
    setAddBusy(true);
    try {
      const iso = new Date(startsAt).toISOString();
      await api.post('/my-slots', { starts_at: iso, duration_minutes: duration });
      setNotice('Слот добавлен — ученики смогут записаться');
      setStartsAt(defaultStart());
      setFilter('all');
      await slots.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать слот');
    } finally {
      setAddBusy(false);
    }
  }

  async function removeSlot() {
    if (!slotToDelete) return;
    setError(null);
    setNotice(null);
    setDeleteBusy(true);
    try {
      await api.del(`/my-slots/${slotToDelete.id}`);
      setNotice('Слот удалён');
      setSlotToDelete(null);
      await slots.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить слот');
      setSlotToDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function createBulk() {
    setError(null);
    setNotice(null);
    setBulkWarning(null);

    if (bulkOccurrences.length === 0) {
      setError('Выберите хотя бы один день недели и время не раньше чем через 10 минут');
      return;
    }
    if (bulkOccurrences.length > 60) {
      setError('За один раз можно создать не более 60 слотов — уменьшите число недель');
      return;
    }

    setBulkBusy(true);
    try {
      const result = await api.post<BulkSlotResult>('/my-slots/bulk', {
        slots: bulkOccurrences.map((date) => ({
          starts_at: date.toISOString(),
          duration_minutes: bulkDuration,
        })),
      });

      const message = [
        `Создано слотов: ${result.created}`,
        result.skipped ? `пропущено: ${result.skipped}` : '',
      ]
        .filter(Boolean)
        .join(', ');
      setNotice(message);

      if (result.skipped > 0) {
        setBulkWarning(
          result.skipped_details
            .slice(0, 3)
            .map((item) => `${formatDateTime(item.starts_at)} — ${item.reason}`)
            .join('; ')
        );
      }

      setBulkOpen(false);
      setFilter('all');
      await slots.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать слоты');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Расписание"
        description="Публикуйте свободное время и управляйте предстоящими сессиями."
        action={
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <CalendarRange className="h-4 w-4" />
            Массовое создание
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {bulkWarning && <Alert tone="warning">Часть слотов пропущена: {bulkWarning}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarPlus className="h-4 w-4 text-teal-600" />
            Свободные слоты
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{availableCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {availableCount > 0
              ? 'Ученики могут записаться'
              : 'Опубликуйте свободное время'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarCheck className="h-4 w-4 text-indigo-600" />
            Забронировано
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{bookedCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {bookedCount > 0
              ? `${pluralize(bookedCount, 'предстоящая', 'предстоящие', 'предстоящих')} ${pluralize(
                  bookedCount,
                  'сессия',
                  'сессии',
                  'сессий'
                )}`
              : 'Пока нет заявок'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Clock className="h-4 w-4 text-indigo-600" />
            Ближайшее окно
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {nextAvailable ? formatDateTime(nextAvailable.starts_at) : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {nextAvailable ? 'Можно предложить ученикам' : 'Нет свободного времени'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarPlus className="h-4 w-4 text-indigo-500" />
            Новый слот
          </div>
          <p className="text-xs text-slate-500">От 30 до 90 минут</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Дата и время начала" htmlFor="starts_at">
            <Input
              id="starts_at"
              type="datetime-local"
              value={startsAt}
              min={minStart}
              max={maxStart}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="Длительность" htmlFor="duration">
            <Select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 минут</option>
              <option value={45}>45 минут</option>
              <option value={60}>60 минут</option>
              <option value={90}>90 минут</option>
            </Select>
          </Field>
          <Button
            onClick={() => void addSlot()}
            loading={addBusy}
            disabled={!startsAt}
            className="sm:mb-0.5"
          >
            <CalendarPlus className="h-4 w-4" />
            Добавить слот
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Слот можно создать не раньше чем через 10 минут и не более чем на 90 дней вперёд.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Предстоящие слоты"
          subtitle={`${upcoming.length} ${pluralize(
            upcoming.length,
            'слот',
            'слота',
            'слотов'
          )} · ${availableCount} ${pluralize(
            availableCount,
            'свободный',
            'свободных',
            'свободных'
          )}`}
          icon={<Clock className="h-4 w-4" />}
        />
        <div className="p-5">
          {slots.loading && !slots.data && (
            <div className="space-y-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          )}
          {slots.error && (
            <ErrorState message={slots.error} onRetry={() => void slots.reload()} />
          )}

          {!slots.loading && !slots.error && upcoming.length === 0 && (
            <EmptyState
              icon={<CalendarPlus className="h-6 w-6" />}
              title="Нет предстоящих слотов"
              description="Добавьте время в форме выше, чтобы ученики могли отправить заявку."
            />
          )}

          {upcoming.length > 0 && (
            <>
              <div className="mb-5 flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                  const count =
                    item.id === 'all'
                      ? upcoming.length
                      : item.id === 'available'
                        ? availableCount
                        : bookedCount;
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

              {filteredUpcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-6 w-6" />}
                  title="В этой категории пока пусто"
                  description="Переключите фильтр, чтобы увидеть остальные слоты."
                  action={
                    <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                      Показать все
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-5">
                  {groups.map((group) => {
                    const dayLabel = formatDayLabel(group.day);
                    const dateLabel = formatDate(group.day);
                    return (
                      <div key={group.day}>
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {dayLabel}
                            {dayLabel !== dateLabel && (
                              <span className="ml-2 font-normal text-slate-400">
                                {dateLabel}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">
                            {group.items.length}{' '}
                            {pluralize(group.items.length, 'слот', 'слота', 'слотов')}
                          </p>
                        </div>
                        <ul className="space-y-2">
                          {group.items.map((slot) => {
                            const isAvailable = slot.status === 'available';
                            return (
                              <li
                                key={slot.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span
                                    className={`flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-xl ${
                                      isAvailable
                                        ? 'bg-teal-50 text-teal-700'
                                        : 'bg-indigo-50 text-indigo-700'
                                    }`}
                                  >
                                    <span className="text-sm font-semibold">
                                      {formatTime(slot.starts_at)}
                                    </span>
                                    <span className="text-[10px] opacity-70">
                                      {formatTime(slot.ends_at)}
                                    </span>
                                  </span>
                                  <div className="min-w-0">
                                    {slot.booking ? (
                                      <>
                                        <p className="truncate text-sm font-medium text-slate-900">
                                          {slot.booking.topic || 'Сессия с учеником'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                          Ученик: {slot.booking.learner_name}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm font-medium text-slate-900">
                                          Свободное время
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                          Доступно для записи
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {slot.booking ? (
                                    <Badge
                                      className={BOOKING_STATUS_STYLES[slot.booking.status]}
                                    >
                                      {BOOKING_STATUS_LABELS[slot.booking.status] ??
                                        slot.booking.status}
                                    </Badge>
                                  ) : (
                                    <Badge className={SLOT_STATUS_STYLES[slot.status]}>
                                      {SLOT_STATUS_LABELS[slot.status] ?? slot.status}
                                    </Badge>
                                  )}

                                  {slot.booking && (
                                    <Link to={`/app/bookings/${slot.booking.id}`}>
                                      <Button variant="outline" size="sm">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        Открыть
                                      </Button>
                                    </Link>
                                  )}

                                  {isAvailable && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSlotToDelete(slot)}
                                      aria-label={`Удалить слот ${formatDateTime(
                                        slot.starts_at
                                      )}`}
                                      title="Удалить слот"
                                    >
                                      <Trash2 className="h-4 w-4 text-rose-500" />
                                    </Button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader
            title="Прошедшие слоты"
            subtitle={`${past.length} ${pluralize(
              past.length,
              'слот',
              'слота',
              'слотов'
            )}`}
            action={
              past.length > 6 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllPast((value) => !value)}
                >
                  {showAllPast ? 'Свернуть' : `Показать все (${past.length})`}
                </Button>
              ) : undefined
            }
          />
          <div className="p-5">
            <ul className="space-y-2">
              {visiblePast.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {formatDateTime(slot.starts_at)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {slot.booking
                        ? `${slot.booking.learner_name} · ${slot.booking.topic || 'Сессия'}`
                        : 'Без записи'}
                    </p>
                  </div>
                  <Badge className={SLOT_STATUS_STYLES[slot.status]}>
                    {SLOT_STATUS_LABELS[slot.status] ?? slot.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(slotToDelete)}
        onClose={() => {
          if (!deleteBusy) setSlotToDelete(null);
        }}
        title="Удалить слот?"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSlotToDelete(null)}
              disabled={deleteBusy}
            >
              Оставить
            </Button>
            <Button
              variant="danger"
              onClick={() => void removeSlot()}
              loading={deleteBusy}
            >
              Удалить
            </Button>
          </>
        }
      >
        {slotToDelete && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-slate-600">
              Слот{' '}
              <span className="font-medium text-slate-900">
                {formatDateTime(slotToDelete.starts_at)}
              </span>{' '}
              будет удалён. Ученики больше не смогут на него записаться.
            </p>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {formatTime(slotToDelete.starts_at)} — {formatTime(slotToDelete.ends_at)}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => {
          if (!bulkBusy) setBulkOpen(false);
        }}
        title="Массовое создание слотов"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkBusy}>
              Отмена
            </Button>
            <Button
              onClick={() => void createBulk()}
              loading={bulkBusy}
              disabled={bulkOccurrences.length === 0 || bulkOccurrences.length > 60}
            >
              Создать{bulkOccurrences.length > 0 ? ` (${bulkOccurrences.length})` : ''}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Первый день" htmlFor="bulk-date">
            <Input
              id="bulk-date"
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
            />
          </Field>
          <Field label="Время начала" htmlFor="bulk-time">
            <Input
              id="bulk-time"
              type="time"
              value={bulkTime}
              onChange={(e) => setBulkTime(e.target.value)}
            />
          </Field>
          <Field label="Длительность" htmlFor="bulk-duration">
            <Select
              id="bulk-duration"
              value={bulkDuration}
              onChange={(e) => setBulkDuration(Number(e.target.value))}
            >
              <option value={30}>30 минут</option>
              <option value={45}>45 минут</option>
              <option value={60}>60 минут</option>
              <option value={90}>90 минут</option>
            </Select>
          </Field>
          <Field label="Повторять недель" htmlFor="bulk-weeks">
            <Select
              id="bulk-weeks"
              value={bulkWeeks}
              onChange={(e) => setBulkWeeks(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Дни недели</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const active = bulkWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWeekday(day.value)}
                  className={`h-10 w-11 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">
            Будет создано слотов: {bulkOccurrences.length}
          </p>
          {bulkOccurrences.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {bulkOccurrences.slice(0, 4).map((date) => (
                <li key={date.toISOString()}>{formatDateTime(date.toISOString())}</li>
              ))}
              {bulkOccurrences.length > 4 && <li>и ещё {bulkOccurrences.length - 4}…</li>}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Выберите дни недели — даты появятся здесь.
            </p>
          )}
          {bulkOccurrences.length > 60 && (
            <p className="mt-2 text-xs font-medium text-rose-600">
              Максимум 60 слотов за раз. Уменьшите число недель или дней.
            </p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Слоты создаются не более чем на 90 дней вперёд. Существующие слоты на то же время
          пропускаются.
        </p>
      </Modal>
    </div>
  );
}
