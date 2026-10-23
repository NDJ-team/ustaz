import { Award, CheckCircle2, Lock, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Badge, Card, EmptyState, Progress } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { formatFullDate, pluralize } from '@/lib/format';

/** Описание всех возможных достижений — соответствует серверным условиям. */
const CATALOG = [
  {
    code: 'first_mentor',
    title: 'Первый наставник',
    description: 'Присоединиться к платформе в роли наставника',
  },
  {
    code: 'first_session',
    title: 'Первая консультация',
    description: 'Провести первую подтверждённую сессию',
  },
  {
    code: 'five_sessions',
    title: 'Опытный наставник',
    description: 'Провести пять подтверждённых сессий',
  },
  {
    code: 'ten_hours',
    title: 'Много помощи',
    description: 'Провести десять подтверждённых сессий',
  },
  {
    code: 'first_project',
    title: 'Первый проект',
    description: 'Получить зачёт за первую миссию',
  },
  {
    code: 'community_active',
    title: 'Активный участник',
    description: 'Заработать 500 баллов за подтверждённые действия',
  },
];

export function AchievementsPage() {
  const { me } = useAuth();
  if (!me) return null;

  const unlockedByCode = new Map(me.achievements.map((a) => [a.code, a]));
  const unlocked = me.achievements.length;
  const total = CATALOG.length;
  const percent = total ? (unlocked / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Достижения"
        description="Награды за активное участие. Открываются автоматически при выполнении условий."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-900">
              Открыто {unlocked} из {total} {pluralize(total, 'достижение', 'достижения', 'достижений')}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">Уровень: {me.level.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-teal-50 text-teal-700 ring-teal-200">
              <Star className="h-3.5 w-3.5" />
              {me.earned} заработано
            </Badge>
            <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
              <Award className="h-3.5 w-3.5" />
              {unlocked} получено
            </Badge>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={percent / 100} />
          <p className="mt-1 text-right text-xs text-slate-400">{Math.round(percent)}%</p>
        </div>
      </Card>

      {unlocked === 0 && (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title="Пока нет открытых достижений"
          description="Проведите сессию, выполните миссию или соберите отзывы — достижения откроются автоматически."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((item) => {
          const unlockedItem = unlockedByCode.get(item.code);
          const isOpen = Boolean(unlockedItem);

          return (
            <Card
              key={item.code}
              className={`relative overflow-hidden p-5 transition-shadow ${
                isOpen ? 'ring-1 ring-teal-200' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isOpen ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isOpen ? <Award className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </span>
                {isOpen && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Получено
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
              <p className="mt-4 text-xs">
                {isOpen && unlockedItem ? (
                  <span className="font-medium text-teal-600">
                    Получено {formatFullDate(unlockedItem.unlocked_at)}
                  </span>
                ) : (
                  <span className="text-slate-400">Ещё не получено</span>
                )}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
