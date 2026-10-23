import { Link } from 'react-router-dom';
import { CalendarCheck2, ChevronRight, Target, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Card } from './ui';

const WAYS = [
  {
    icon: CalendarCheck2,
    title: 'Провести сессию',
    description: 'Подтверждённая сессия с учеником',
    points: '+100',
    to: '/app/bookings',
    mentorOnly: true,
  },
  {
    icon: Target,
    title: 'Выполнить миссию',
    description: 'Зачёт от администратора',
    points: '+80…+200',
    to: '/app/missions',
    mentorOnly: false,
  },
  {
    icon: Users,
    title: 'Пригласить друга',
    description: 'Друг зарегистрируется по ссылке',
    points: '+50',
    to: '/app/rewards',
    mentorOnly: false,
  },
];

export function EarnPointsCard() {
  const { me } = useAuth();
  const isMentor = me?.profile.role === 'mentor';
  const ways = WAYS.filter((item) => !item.mentorOnly || isMentor);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">Как заработать баллы</p>
          <p className="text-sm text-slate-500">
            {isMentor
              ? 'Проводите сессии, выполняйте миссии и приглашайте друзей'
              : 'Выполняйте миссии и приглашайте друзей — баллы копятся автоматически'}
          </p>
        </div>
        <Link to="/app/points">
          <Button variant="outline" size="sm">
            Журнал баллов
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ways.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.to}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <span className="shrink-0 text-sm font-semibold text-teal-600">{item.points}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
