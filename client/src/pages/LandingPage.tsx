import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  Coins,
  Gift,
  GraduationCap,
  Leaf,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, DemoBadge, LinkButton } from '@/components/ui';
import { Logo } from '@/components/Logo';

const STEPS = [
  {
    icon: Users,
    title: 'Найдите наставника',
    text: 'Каталог проверенных студентов и специалистов по направлениям: программирование, дизайн, английский, бизнес и карьера.',
  },
  {
    icon: CalendarCheck,
    title: 'Забронируйте время',
    text: 'Откройте свободные слоты, выберите удобное время и опишите тему. Наставник подтверждает заявку — обе стороны видят сессию.',
  },
  {
    icon: Coins,
    title: 'Проведите сессию',
    text: 'После подтверждённого обеими сторонами занятия наставник получает баллы USTAZ за реально проведённую консультацию.',
  },
  {
    icon: Gift,
    title: 'Обменяйте баллы',
    text: 'Баллы — внутренняя репутация. Их можно обменять на бонусы партнёров и отследить каждое начисление в открытом журнале.',
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Честная экономика',
    text: 'Баланс считается только на сервере из журнала транзакций. Начисления идемпотентны — повторное действие не удваивает баллы.',
  },
  {
    icon: Target,
    title: 'Миссии роста',
    text: 'Практические задания с наградой за результат. Заявку проверяет администратор, награда начисляется только после подтверждения.',
  },
  {
    icon: Leaf,
    title: 'Растёт сообщество',
    text: 'Помогая младшим, вы формируете репутацию и уровень: от Новичка до Эксперта сообщества.',
  },
];

export function LandingPage() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const startPath = me ? '/app' : '/register';

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#how" className="transition-colors hover:text-slate-900">
              Как это работает
            </a>
            <a href="#economy" className="transition-colors hover:text-slate-900">
              Баллы
            </a>
            <a href="#missions" className="transition-colors hover:text-slate-900">
              Миссии
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {me ? (
              <LinkButton to="/app" size="sm">
                В приложение
              </LinkButton>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Войти
                </Button>
                <LinkButton to="/register" size="sm">
                  Начать
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
            <div className="animate-fade-in">
              <Badge className="bg-white text-indigo-700 ring-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                Платформа взаимного наставничества
              </Badge>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Делись знаниями.
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
                  Расти вместе.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">
                USTAZ связывает молодёжь Кыргызстана с наставниками: студентами и специалистами,
                готовыми помочь бесплатно. Проводите сессии, выполняйте миссии и получайте баллы
                репутации.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton to={startPath} size="lg">
                  {me ? 'Перейти в приложение' : 'Создать аккаунт'}
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton to="/app/mentors" variant="outline" size="lg">
                  Смотреть наставников
                </LinkButton>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Сессия</dt>
                  <dd className="text-lg font-semibold text-slate-900">45 минут</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Награда</dt>
                  <dd className="text-lg font-semibold text-slate-900">100 баллов</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Стоимость</dt>
                  <dd className="text-lg font-semibold text-slate-900">Бесплатно</dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-teal-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-indigo-200/50 blur-3xl" />
              <Card className="relative animate-fade-in p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Ближайшая сессия</p>
                  <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">Подтверждена</Badge>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white">
                    А
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">Айгерим К.</p>
                    <p className="text-xs text-slate-500">Frontend-разработка · Бишкек</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <CalendarCheck className="h-4 w-4 text-indigo-500" />
                    Вторник, 18:00 — 18:45
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <GraduationCap className="h-4 w-4 text-teal-500" />
                    Тема: разбор первого React-проекта
                  </div>
                </div>
                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Награда наставнику</span>
                    <span className="font-semibold text-teal-600">+100 баллов</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Начисляется после того, как обе стороны подтвердят проведение сессии.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Как это работает</h2>
            <p className="mt-3 text-slate-600">
              Четыре простых шага: от знакомства с наставником до бонуса за помощь другим.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-slate-300">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Economy */}
        <section id="economy" className="border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Баллы — это репутация, а не деньги
                </h2>
                <p className="mt-4 text-slate-600">
                  USTAZ Points отражают вклад человека в сообщество. Их нельзя купить или вывести —
                  только заработать реальными действиями и потратить на бонусы партнёров.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Начисление только на сервере, из журнала транзакций',
                    'Повторные действия не создают дубликатов начислений',
                    'Прозрачная история: видно каждую операцию',
                    'Уровни от Новичка до Эксперта сообщества',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Card className="p-5">
                  <Coins className="h-6 w-6 text-indigo-500" />
                  <p className="mt-3 text-2xl font-bold text-slate-900">+100</p>
                  <p className="text-sm text-slate-600">за подтверждённую сессию наставнику</p>
                </Card>
                <Card className="p-5">
                  <Target className="h-6 w-6 text-teal-500" />
                  <p className="mt-3 text-2xl font-bold text-slate-900">+80…200</p>
                  <p className="text-sm text-slate-600">за принятую миссию</p>
                </Card>
                <Card className="p-5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Уровни участия</p>
                      <p className="text-xs text-slate-500">
                        По заработанным баллам, без учёта потраченных
                      </p>
                    </div>
                    <DemoBadge />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      ['Новичок', '0'],
                      ['Помощник', '200'],
                      ['Наставник', '600'],
                      ['Эксперт', '1500'],
                    ].map(([name, value]) => (
                      <span
                        key={name}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {name} · {value}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Missions + features */}
        <section id="missions" className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Миссии и обмен баллов
            </h2>
            <p className="mt-3 text-slate-600">
              Практика с понятным результатом и реальные бонусы от партнёров платформы.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
                </Card>
              );
            })}
          </div>

          <Card className="mt-8 flex flex-col items-center gap-4 bg-gradient-to-br from-indigo-600 to-teal-500 p-8 text-center text-white md:flex-row md:justify-between md:text-left">
            <div>
              <h3 className="text-xl font-semibold">Готовы начать?</h3>
              <p className="mt-1 text-sm text-white/85">
                Создайте аккаунт ученика или наставника и проведите первую сессию уже сегодня.
              </p>
            </div>
            <LinkButton
              to={startPath}
              size="lg"
              className="bg-white text-indigo-700 hover:bg-white/90"
            >
              {me ? 'В приложение' : 'Присоединиться'}
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row lg:px-8">
          <Logo />
          <p className="text-center sm:text-right">
            USTAZ — учебный MVP для IT-олимпиады. Демонстрационные данные помечены знаком «Демо».
          </p>
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Войти
          </Link>
        </div>
      </footer>
    </div>
  );
}
