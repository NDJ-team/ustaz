import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-slate-600">{footer}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-teal-600 lg:block">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <blockquote className="max-w-md">
            <p className="text-2xl font-semibold leading-snug">
              «Когда ты объясняешь другому, ты понимаешь сам. Наставничество растёт в обе стороны.»
            </p>
            <footer className="mt-6 text-sm text-white/80">
              Принцип платформы USTAZ
            </footer>
          </blockquote>
          <div className="mt-12 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-3xl font-bold">45</p>
              <p className="text-white/80">минут на сессию</p>
            </div>
            <div>
              <p className="text-3xl font-bold">6</p>
              <p className="text-white/80">направлений обучения</p>
            </div>
            <div>
              <p className="text-3xl font-bold">+100</p>
              <p className="text-white/80">баллов наставнику</p>
            </div>
            <div>
              <p className="text-3xl font-bold">0 ₸</p>
              <p className="text-white/80">стоимость участия</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthSwitch({ text, to, label }: { text: string; to: string; label: string }) {
  return (
    <span>
      {text}{' '}
      <Link to={to} className="font-semibold text-indigo-600 hover:text-indigo-700">
        {label}
      </Link>
    </span>
  );
}
