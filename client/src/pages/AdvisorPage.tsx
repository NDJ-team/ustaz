import { useState } from 'react';
import { Bot, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, CardHeader } from '@/components/ui';

type View = 'learner' | 'mentor';

export function AdvisorPage() {
  const [view, setView] = useState<View>('learner');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Помощник по развитию"
        description="Макет будущего ассистента для выбора учебного пути ученикам и наставникам."
      />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Это визуальный демо-макет, не подключённый к ИИ. Примеры ответов подготовлены заранее;
          бюджет, профиль и персональные данные никуда не отправляются.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Кому нужна рекомендация">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'learner'}
          onClick={() => setView('learner')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
            view === 'learner'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Я учусь
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'mentor'}
          onClick={() => setView('mentor')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
            view === 'mentor'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Я наставник
        </button>
      </div>

      <Card>
        <CardHeader
          title="Пример диалога"
          subtitle="Так может выглядеть помощник после подключения рекомендаций"
          icon={<Bot className="h-4 w-4" />}
        />
        <div className="space-y-4 p-5 sm:p-6">
          {view === 'learner' ? (
            <>
              <div className="ml-auto max-w-xl rounded-2xl rounded-br-md bg-indigo-600 p-4 text-sm text-white">
                Хочу начать изучать IT. Бюджет пока 0 сом. С чего начать?
              </div>
              <div className="max-w-2xl rounded-2xl rounded-bl-md bg-slate-100 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Пример ответа помощника
                </div>
                <p className="mt-2">
                  Начните с бесплатной базы по веб-разработке, затем пройдите мини-задание. Для
                  вопросов по проекту найдите наставника по программированию — платный курс сейчас
                  не обязателен.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-white text-slate-700 ring-slate-200">Бюджет: 0 сом</Badge>
                  <Badge className="bg-white text-slate-700 ring-slate-200">Стартовый уровень</Badge>
                  <Badge className="bg-white text-slate-700 ring-slate-200">Без оплаты</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/app/free-courses">
                    <Button size="sm">Бесплатные курсы</Button>
                  </Link>
                  <Link to="/app/mentors">
                    <Button size="sm" variant="outline">Найти наставника</Button>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="ml-auto max-w-xl rounded-2xl rounded-br-md bg-indigo-600 p-4 text-sm text-white">
                Я наставник по frontend. Как собрать репутацию и начать зарабатывать на курсах?
              </div>
              <div className="max-w-2xl rounded-2xl rounded-bl-md bg-slate-100 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Пример ответа помощника
                </div>
                <p className="mt-2">
                  Оформите профиль и направления, проводите бесплатные сессии, просите ученика
                  оставить отзыв после занятия. В будущей модели отзывы и качество материалов помогут
                  получить статус для платного курса. Порог рейтинга и выплаты ещё не определены.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-white text-slate-700 ring-slate-200">Отзывы после занятий</Badge>
                  <Badge className="bg-white text-slate-700 ring-slate-200">Подтверждённые сессии</Badge>
                  <Badge className="bg-white text-slate-700 ring-slate-200">Без гарантии дохода</Badge>
                </div>
                <div className="mt-4">
                  <Link to="/app/schedule">
                    <Button size="sm">Открыть расписание</Button>
                  </Link>
                </div>
              </div>
            </>
          )}
          <p className="text-center text-xs text-slate-500">
            Рекомендация статична и служит только для демонстрации идеи.
          </p>
        </div>
      </Card>

      <Card className="border-dashed p-5">
        <p className="text-sm font-semibold text-slate-900">Что потребуется для настоящего помощника</p>
        <p className="mt-1 text-sm text-slate-600">
          Каталог проверенных курсов, актуальные цены, бюджет пользователя, прозрачные правила
          рекомендаций, защита данных и подключение модели ИИ с ограничениями и проверкой качества.
        </p>
      </Card>
    </div>
  );
}
