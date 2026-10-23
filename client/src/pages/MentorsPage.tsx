import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  MapPin,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useMeta } from '@/lib/useMeta';
import type { Mentor } from '@/lib/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DemoBadge,
  EmptyState,
  ErrorState,
  Input,
  Select,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime, pluralize } from '@/lib/format';

const SORTS = [
  { id: 'rating', label: 'По рейтингу' },
  { id: 'sessions', label: 'По числу сессий' },
  { id: 'new', label: 'Сначала новые' },
] as const;

type SortId = (typeof SORTS)[number]['id'];

function isSort(value: string): value is SortId {
  return SORTS.some((item) => item.id === value);
}

function MentorCardSkeleton() {
  return (
    <Card className="animate-pulse p-5">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-3 w-4/5 rounded bg-slate-100" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-20 rounded-full bg-slate-100" />
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 h-16 rounded-xl bg-slate-100" />
      <div className="mt-4 h-10 rounded-xl bg-slate-100" />
    </Card>
  );
}

export function MentorsPage() {
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();

  const qParam = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const city = params.get('city') ?? '';
  const sortParam = params.get('sort') ?? 'rating';
  const sort: SortId = isSort(sortParam) ? sortParam : 'rating';

  const [q, setQ] = useState(qParam);

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  function updateFilters(patch: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  }

  // Не отправляем запрос на каждую букву: адрес обновляется после паузы.
  useEffect(() => {
    const value = q.trim();
    if (value === qParam) return;
    const timer = window.setTimeout(() => {
      updateFilters({ q: value || null });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, qParam]);

  const query = useMemo(() => {
    const next = new URLSearchParams();
    if (qParam) next.set('q', qParam);
    if (category) next.set('category', category);
    if (city) next.set('city', city);
    next.set('sort', sort);
    return next.toString();
  }, [qParam, category, city, sort]);

  const mentors = useAsync<Mentor[]>(() => api.get<Mentor[]>(`/mentors?${query}`), [query]);

  const categoryLabels = useMemo(
    () => new Map((meta?.categories ?? []).map((item) => [item.id, item.label])),
    [meta]
  );
  const [showAllCategories, setShowAllCategories] = useState(false);
  const allCategories = meta?.categories ?? [];
  const hiddenCategories = Math.max(0, allCategories.length - 7);
  const visibleCategories =
    showAllCategories || hiddenCategories === 0
      ? allCategories
      : allCategories.filter((item, index) => index < 7 || item.id === category);

  const hasFilters = Boolean(qParam || category || city || sort !== 'rating');

  function resetFilters() {
    setQ('');
    setParams(new URLSearchParams(), { replace: true });
  }

  function clearSearch() {
    setQ('');
    updateFilters({ q: null });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Каталог наставников"
        description="Найдите человека, который поможет разобраться в теме и поддержит на пути."
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Имя, навык или город"
              className="pl-9 pr-9"
              aria-label="Поиск наставников"
            />
            {q && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Очистить поиск"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={city}
            onChange={(event) => updateFilters({ city: event.target.value || null })}
            aria-label="Город"
          >
            <option value="">Все города</option>
            {(meta?.cities ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <Select
            value={sort}
            onChange={(event) => updateFilters({ sort: event.target.value })}
            aria-label="Сортировка"
          >
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={category === ''}
            onClick={() => updateFilters({ category: null })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              category === ''
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-900'
            }`}
          >
            Все направления
          </button>
          {(visibleCategories).map((item) => {
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  updateFilters({ category: active ? null : item.id })
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {hiddenCategories > 0 && (
            <button
              type="button"
              onClick={() => setShowAllCategories((value) => !value)}
              aria-expanded={showAllCategories}
              className="rounded-full border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              {showAllCategories
                ? 'Свернуть направления'
                : `Ещё ${hiddenCategories} ${pluralize(
                    hiddenCategories,
                    'направление',
                    'направления',
                    'направлений'
                  )}`}
            </button>
          )}
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400">Показаны наставники под ваши фильтры</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Сбросить всё
            </button>
          </div>
        )}
      </Card>

      {mentors.error && (
        <ErrorState message={mentors.error} onRetry={() => void mentors.reload()} />
      )}

      {mentors.loading && !mentors.data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <MentorCardSkeleton key={index} />
          ))}
        </div>
      )}

      {mentors.data && mentors.data.length === 0 && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Никого не найдено"
          description={
            hasFilters
              ? category
                ? 'В этом демо-каталоге пока нет наставника с таким направлением. Попробуйте соседнюю тему или сбросьте фильтр.'
                : 'Попробуйте изменить запрос, направление или город.'
              : 'Наставники появятся здесь, как только откроют профили.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            ) : undefined
          }
        />
      )}

      {mentors.data && mentors.data.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {mentors.loading ? (
                'Обновляем подборку…'
              ) : (
                <>
                  Найдено:{' '}
                  <span className="font-medium text-slate-900">{mentors.data.length}</span>{' '}
                  {pluralize(
                    mentors.data.length,
                    'наставник',
                    'наставника',
                    'наставников'
                  )}
                </>
              )}
            </p>
            <p className="text-xs text-slate-400">
              Откройте профиль, чтобы выбрать свободное время
            </p>
          </div>

          <div
            className={`grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${
              mentors.loading ? 'opacity-60' : ''
            }`}
          >
            {mentors.data.map((mentor) => {
              const skills = mentor.skills.map(
                (skill) => categoryLabels.get(skill) ?? skill
              );
              const slots = mentor.stats.available_slots;

              return (
                <Card
                  key={mentor.id}
                  className="group flex flex-col p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={mentor.display_name}
                      size={52}
                      src={mentor.avatar_url}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="min-w-0 truncate font-semibold text-slate-900">
                          <Link
                            to={`/app/mentors/${mentor.id}`}
                            className="hover:text-indigo-600"
                          >
                            {mentor.display_name}
                          </Link>
                        </h3>
                        {mentor.is_demo && <DemoBadge />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                        {mentor.headline || 'Наставник USTAZ'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                    {mentor.stats.rating !== null ? (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {mentor.stats.rating}
                        <span className="font-normal text-slate-400">
                          · {mentor.stats.reviews_count}{' '}
                          {pluralize(
                            mentor.stats.reviews_count,
                            'отзыв',
                            'отзыва',
                            'отзывов'
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Пока без отзывов</span>
                    )}

                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {mentor.stats.sessions_count}{' '}
                      {pluralize(
                        mentor.stats.sessions_count,
                        'сессия',
                        'сессии',
                        'сессий'
                      )}
                    </span>

                    {mentor.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {mentor.city}
                      </span>
                    )}
                  </div>

                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skills.slice(0, 3).map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-slate-100 text-slate-600 ring-slate-200"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {skills.length > 3 && (
                        <Badge className="bg-slate-100 text-slate-500 ring-slate-200">
                          +{skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div
                    className={`mt-4 flex items-start gap-2.5 rounded-xl p-3 ring-1 ring-inset ${
                      mentor.stats.next_slot
                        ? 'bg-teal-50/70 ring-teal-100'
                        : 'bg-slate-50 ring-slate-100'
                    }`}
                  >
                    <CalendarClock
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        mentor.stats.next_slot ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-[11px] font-medium uppercase tracking-wide ${
                          mentor.stats.next_slot ? 'text-teal-700' : 'text-slate-500'
                        }`}
                      >
                        Ближайшее окно
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {mentor.stats.next_slot
                          ? formatDateTime(mentor.stats.next_slot)
                          : 'Пока нет свободных слотов'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {slots > 0
                          ? `Свободно ${slots} ${pluralize(
                              slots,
                              'слот',
                              'слота',
                              'слотов'
                            )}`
                          : 'Загляните позже — расписание обновляется'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-end border-t border-slate-100 pt-4">
                    <Link
                      to={
                        mentor.stats.next_slot
                          ? `/app/mentors/${mentor.id}#slots`
                          : `/app/mentors/${mentor.id}`
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                      {mentor.stats.next_slot ? 'Выбрать время' : 'Открыть профиль'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
