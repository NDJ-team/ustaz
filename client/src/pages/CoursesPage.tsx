import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Clock, GraduationCap, Star, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { PaymentModal } from '@/components/PaymentModal';
import { useToast } from '@/components/Toast';
import { DEMO_COURSES, useLearningProgress } from '@/lib/learning';
import { DEMO_LESSONS, type PaidLesson } from '@/lib/paidCourses';

function CoursesCatalogPage({ mode }: { mode: 'free' | 'paid' }) {
  const { me } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState<PaidLesson | null>(null);
  const { progress, error } = useLearningProgress(me?.profile.id ?? '');

  const filtered = DEMO_LESSONS;

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'free' ? 'Бесплатные курсы' : 'Платные курсы'}
        description={
          mode === 'free'
            ? 'Короткие вводные курсы и задания для знакомства с разными направлениями.'
            : 'Углублённые занятия с наставниками. Здесь показаны только демонстрационные предложения.'
        }
      />

      <nav aria-label="Разделы обучения" className="flex flex-wrap gap-2">
        <Link
          to="/app/free-courses"
          aria-current={mode === 'free' ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-medium ${
            mode === 'free'
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Бесплатные курсы
        </Link>
        <Link
          to="/app/paid-lessons"
          aria-current={mode === 'paid' ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-medium ${
            mode === 'paid'
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Платные курсы
        </Link>
      </nav>

      {mode === 'free' && (
        <section className="space-y-4" aria-labelledby="free-courses-title">
          <CardHeader
            title={<span id="free-courses-title">Все бесплатные курсы</span>}
            subtitle="Короткие демо-курсы, чтобы освоить основы и выбрать направление"
            icon={<GraduationCap className="h-4 w-4" />}
          />
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DEMO_COURSES.map((course) => {
              const completed = Boolean(progress.completedCourses[course.id]);
              return (
                <Card key={course.id} className="flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{course.direction}</Badge>
                    <Badge
                      className={
                        completed
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-teal-50 text-teal-700 ring-teal-200'
                      }
                    >
                      {completed ? 'Пройдено · демо' : 'Бесплатно · демо'}
                    </Badge>
                  </div>
                  <h2 className="mt-4 font-semibold text-slate-900">{course.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{course.description}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> 1 урок + мини-задание
                    </span>
                    <span>{course.level}</span>
                  </div>
                  <Link
                    to={`/app/free-courses/${course.id}`}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                  >
                    {completed ? 'Открыть результат' : 'Начать бесплатно'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <p className="text-sm text-slate-700">
                Пройдите короткий урок и демо-задание. Результат сохранится в этом браузере и
                отобразится в разделе навыков.
              </p>
            </div>
            <Link to="/app/skills" className="shrink-0">
              <Button size="sm">Открыть навыки</Button>
            </Link>
          </div>
        </section>
      )}

      {mode === 'paid' && me?.profile.role === 'mentor' && (
        <Card className="border-teal-100 bg-teal-50/50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Как наставнику перейти к платным занятиям</p>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Сначала помогайте ученикам на бесплатных сессиях, затем собирайте подтверждённые отзывы.
                В демонстрационной модели высокий рейтинг и опыт дают больше доверия в каталоге платных уроков.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Сейчас это концепция для демо: автоматический допуск и реальные выплаты не подключены.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge className="bg-white text-slate-700 ring-slate-200">
                Рейтинг: {me.stats.rating?.toFixed(1) ?? '—'}
              </Badge>
              <Badge className="bg-white text-slate-700 ring-slate-200">
                Отзывы: {me.stats.reviews_count}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {mode === 'paid' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Демо-предложения наставников</h2>
              <p className="mt-1 text-sm text-slate-500">
                Указаны примерные цены. Заказ и реальная оплата не проводятся.
              </p>
            </div>
            <Badge className="bg-amber-50 text-amber-700 ring-amber-200">Демо-предложения</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((lesson) => (
              <Card key={lesson.id} className="flex flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={lesson.mentor} size={44} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lesson.mentor}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                            {lesson.mentorStatus}
                          </Badge>
                          <Badge>{lesson.direction}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{lesson.price} сом</p>
                      <p className="text-xs text-slate-500">за занятие</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{lesson.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {lesson.duration} мин
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        {lesson.format}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {lesson.level}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-500" />
                        {lesson.rating.toFixed(1)} ({lesson.reviews})
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">Условный пример · демо</p>
                    <Button onClick={() => setSelected(lesson)}>Подробнее</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <EmptyState
              title="Пока нет платных курсов"
              description="Демо-предложения появятся здесь позже."
            />
          )}

          <PaymentModal
            open={Boolean(selected)}
            onClose={() => setSelected(null)}
            amount={selected?.price ?? 0}
            title={selected ? `Оплата: ${selected.title}` : 'Оплата курса'}
            description={selected ? `Наставник: ${selected.mentor}` : undefined}
            onSuccess={() => {
              toast.success('Оплата имитирована. Реальный платёж не выполнялся.');
            }}
          />
        </>
      )}
    </div>
  );
}

export function FreeCoursesPage() {
  return <CoursesCatalogPage mode="free" />;
}

export function PaidLessonsPage() {
  return <CoursesCatalogPage mode="paid" />;
}
