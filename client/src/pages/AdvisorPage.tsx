import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Bot,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Alert, Badge, Button, Card, CardHeader } from '@/components/ui';
import { DEMO_COURSES, useLearningProgress } from '@/lib/learning';
import { DEMO_LESSONS } from '@/lib/paidCourses';
import { useAuth } from '@/lib/auth';

type LearningLevel = 'beginner' | 'some-experience';

export function AdvisorPage() {
  const { me } = useAuth();
  const { progress, error: progressError } = useLearningProgress(me?.profile.id ?? '');
  const [courseId, setCourseId] = useState(DEMO_COURSES[0]?.id ?? '');
  const [level, setLevel] = useState<LearningLevel>('beginner');
  const [budget, setBudget] = useState('0');
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCourse = DEMO_COURSES.find((course) => course.id === courseId);
  const budgetAmount = Number(budget);
  const relatedOffers = selectedCourse
    ? DEMO_LESSONS.filter((offer) => offer.relatedCourseIds.includes(selectedCourse.id)).sort(
        (a, b) => a.price - b.price
      )
    : [];
  const affordableOffer = relatedOffers.find((offer) => offer.price <= budgetAmount);
  const completed = selectedCourse
    ? progress.completedCourses[selectedCourse.id]
    : undefined;

  function createRecommendation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBudget = Number(budget);
    if (!budget.trim() || !Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setFormError('Укажите бюджет 0 сом или больше.');
      setShowRecommendation(false);
      return;
    }
    setFormError(null);
    setShowRecommendation(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ustaz AI Demo"
        description="Подберите учебный маршрут по своей цели, уровню и бюджету."
      />

      <Alert tone="warning">
        Это бесплатный помощник на правилах, а не подключённая языковая модель. Ответ формируется
        прямо в браузере из каталога USTAZ; ваши данные никуда не отправляются.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader
            title="Расскажите, что вам нужно"
            subtitle="Выберите варианты — помощник составит персональный план."
            icon={<Bot className="h-4 w-4" />}
          />
          <form onSubmit={createRecommendation} className="space-y-5 p-5 sm:p-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Какое направление хотите изучать?
              </span>
              <select
                value={courseId}
                onChange={(event) => {
                  setCourseId(event.target.value);
                  setShowRecommendation(false);
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {DEMO_COURSES.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.direction} — {course.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Какой у вас уровень?
              </span>
              <select
                value={level}
                onChange={(event) => {
                  setLevel(
                    event.target.value === 'some-experience' ? 'some-experience' : 'beginner'
                  );
                  setShowRecommendation(false);
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="beginner">Начинаю с нуля</option>
                <option value="some-experience">Уже знаком(а) с темой</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Wallet className="h-4 w-4 text-slate-500" />
                Бюджет на обучение, сом
              </span>
              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={budget}
                onChange={(event) => {
                  setBudget(event.target.value);
                  setShowRecommendation(false);
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'budget-error' : undefined}
              />
            </label>

            {formError && (
              <p id="budget-error" role="alert" className="text-sm text-rose-600">
                {formError}
              </p>
            )}
            {progressError && (
              <p role="alert" className="text-sm text-rose-600">
                Не удалось прочитать прогресс курса: {progressError}
              </p>
            )}

            <Button type="submit" className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" />
              Подобрать план
            </Button>
          </form>
        </Card>

        <Card className="h-fit border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Как работает помощник</p>
              <p className="text-xs text-slate-500">Бесплатно · без регистрации у ИИ-сервисов</p>
            </div>
          </div>
          <ol className="mt-5 space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="font-semibold text-indigo-600">1.</span>
              Выберите учебную цель и свой уровень.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-indigo-600">2.</span>
              Укажите сумму, которую готовы потратить.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-indigo-600">3.</span>
              Получите бесплатный курс и следующий шаг.
            </li>
          </ol>
          <p className="mt-5 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-600">
            Платные карточки и цены сейчас демонстрационные. Помощник не оформляет записи и не
            принимает оплату.
          </p>
        </Card>
      </div>

      {showRecommendation && selectedCourse && (
        <Card className="overflow-hidden border-indigo-200">
          <CardHeader
            title="Ваш учебный план"
            subtitle="Подбор основан на выбранных ответах и каталоге USTAZ."
            icon={<Sparkles className="h-4 w-4" />}
          />
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge>{selectedCourse.direction}</Badge>
              <Badge>{level === 'beginner' ? 'С нуля' : 'Есть опыт'}</Badge>
              <Badge>Бюджет: {budgetAmount.toLocaleString('ru-RU')} сом</Badge>
            </div>

            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="flex items-center gap-2 font-semibold text-indigo-950">
                <BookOpen className="h-4 w-4" />
                {completed ? 'Вы уже прошли вводный курс' : 'Шаг 1 · бесплатный курс'}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{selectedCourse.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                {level === 'beginner'
                  ? `Начните с короткого урока и выполните мини-задание по теме «${selectedCourse.direction}».`
                  : `Используйте урок «${selectedCourse.lessonTitle}» как быструю проверку базы, затем переходите к практике.`}
              </p>
              <Link
                to={`/app/free-courses/${selectedCourse.id}`}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg font-medium text-indigo-700 hover:text-indigo-900"
              >
                {completed ? 'Посмотреть результат курса' : 'Открыть бесплатный курс'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <BriefcaseBusiness className="h-4 w-4 text-teal-600" />
                Шаг 2 · следующий шаг
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {level === 'beginner'
                  ? 'После задания проверьте результат в навыках. Если появятся вопросы, найдите наставника по этому направлению.'
                  : 'Пройдите задание для проверки базы и обратитесь к наставнику за разбором реального проекта.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/app/skills">
                  <Button size="sm" variant="outline">Мои навыки</Button>
                </Link>
                <Link to="/app/mentors">
                  <Button size="sm" variant="outline">Найти наставника</Button>
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Платный вариант в рамках бюджета</p>
              {budgetAmount === 0 ? (
                <p className="mt-1 text-sm text-slate-600">
                  При бюджете 0 сом можно начать бесплатно — покупать курс сейчас не обязательно.
                </p>
              ) : affordableOffer ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">
                    В демо-каталоге есть подходящее предложение: {affordableOffer.title} —{' '}
                    {affordableOffer.price.toLocaleString('ru-RU')} сом. Оно укладывается в ваш
                    бюджет, но цена и предложение условные.
                  </p>
                  <Link
                    to="/app/paid-lessons"
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg font-medium text-indigo-700 hover:text-indigo-900"
                  >
                    Посмотреть платный каталог
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : relatedOffers.length > 0 ? (
                <p className="mt-1 text-sm text-slate-600">
                  В демо-каталоге есть предложения по этой теме от{' '}
                  {relatedOffers[0].price.toLocaleString('ru-RU')} сом, но они превышают указанный
                  бюджет. Начните с бесплатного курса — увеличивать бюджет не обязательно.
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  В каталоге пока нет платного демо-предложения по этой теме. Начните с бесплатного
                  курса и попробуйте найти наставника.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Ustaz AI Demo — подборщик на правилах, а не генеративная ИИ-модель. Не отправляйте сюда
        конфиденциальную информацию.
      </p>
    </div>
  );
}
