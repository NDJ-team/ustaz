import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpenCheck,
  Briefcase,
  Bot,
  CalendarDays,
  Coins,
  Gift,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { NOTIFICATIONS_CHANGED_EVENT } from '@/lib/notifications';
import type { NotificationList } from '@/lib/types';
import { Avatar, Badge, Button } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { ROLE_LABELS, pluralize } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Array<'learner' | 'mentor' | 'admin'>;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Мой путь',
    items: [
      { to: '/app', label: 'Обзор', icon: LayoutDashboard },
      { to: '/app/free-courses', label: 'Бесплатные курсы', icon: GraduationCap },
      { to: '/app/paid-lessons', label: 'Платные курсы', icon: BookOpenCheck },
      { to: '/app/mentors', label: 'Наставники', icon: Users },
      { to: '/app/skills', label: 'Мои навыки', icon: Award },
      { to: '/app/career', label: 'Карьера', icon: Briefcase },
      { to: '/app/advisor', label: 'Ustaz AI Demo', icon: Bot },
    ],
  },
  {
    label: 'Сообщество',
    items: [
      { to: '/app/bookings', label: 'Мои сессии', icon: CalendarDays },
      { to: '/app/schedule', label: 'Расписание', icon: BookOpenCheck, roles: ['mentor'] },
      { to: '/app/missions', label: 'Миссии', icon: Target },
      { to: '/app/achievements', label: 'Достижения', icon: Award },
    ],
  },
  {
    label: 'Аккаунт',
    items: [
      { to: '/app/points', label: 'Баллы и финансы', icon: Coins },
      { to: '/app/rewards', label: 'Демо-бонусы', icon: Gift },
      { to: '/app/notifications', label: 'Уведомления', icon: Bell },
      { to: '/app/profile', label: 'Профиль', icon: UserRound },
      { to: '/app/admin', label: 'Админка', icon: Sparkles, roles: ['admin'] },
    ],
  },
];

export function AppShell() {
  const { me, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      try {
        const data = await api.get<NotificationList>('/notifications?limit=1');
        if (!cancelled) setUnread(data.unread);
      } catch {
        // Счётчик не критичен для работы приложения: не показываем ошибку.
      }
    }

    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 45_000);
    const onChange = () => void loadUnread();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
    };
  }, []);

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || (me && item.roles.includes(me.profile.role))
    ),
  })).filter((group) => group.items.length > 0);

  const primaryItems: NavItem[] = me
    ? [
        { to: '/app', label: 'Обзор', icon: LayoutDashboard },
        me.profile.role === 'mentor'
          ? { to: '/app/schedule', label: 'Расписание', icon: BookOpenCheck }
          : { to: '/app/mentors', label: 'Наставники', icon: Users },
        { to: '/app/free-courses', label: 'Бесплатные', icon: GraduationCap },
        { to: '/app/bookings', label: 'Сессии', icon: CalendarDays },
      ]
    : [];

  const moreActive =
    mobileOpen ||
    !primaryItems.some((item) =>
      item.to === '/app'
        ? location.pathname === '/app'
        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    );

  const SidebarContent = (
    <div className="flex h-full flex-col gap-1">
      <div className="px-4 pb-4 pt-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3">
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                    {item.to === '/app/notifications' && unread > 0 && (
                      <span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      {me && (
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Avatar name={me.profile.display_name} size={40} src={me.profile.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {me.profile.display_name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {ROLE_LABELS[me.profile.role]}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="mobile-navigation"
            className="absolute left-0 top-0 h-full w-[85vw] max-w-72 animate-fade-in bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
          >
            <button
              type="button"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              onClick={() => setMobileOpen(false)}
              aria-label="Закрыть меню"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-w-0 lg:hidden">
              <Logo compact />
            </div>
          </div>
          {me && (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <NavLink
                to="/app/notifications"
                aria-label={
                  unread > 0 ? `Уведомления, непрочитанных: ${unread}` : 'Уведомления'
                }
                className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>
              <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                <Coins className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {me.balance} {pluralize(me.balance, 'балл', 'балла', 'баллов')}
                </span>
                <span className="sm:hidden">{me.balance}</span>
              </Badge>
              <Badge className="hidden bg-teal-50 text-teal-700 ring-teal-200 sm:inline-flex">
                {me.level.name}
              </Badge>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 pb-28 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        {me && (
          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-12px_rgba(15,23,42,0.25)] backdrop-blur lg:hidden"
            aria-label="Основная навигация"
          >
            <div className="mx-auto grid max-w-lg grid-cols-5">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app'}
                    className={({ isActive }) =>
                      `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
                        isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                            isActive ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="max-w-full truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
                  moreActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-900'
                }`}
                aria-label="Открыть полное меню"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
              >
                <span
                  className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                    moreActive ? 'bg-indigo-50' : ''
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
                  )}
                </span>
                <span>Ещё</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
