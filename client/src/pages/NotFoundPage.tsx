import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { LinkButton } from '@/components/ui';
import { Logo } from '@/components/Logo';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <Compass className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Страница не найдена</h1>
        <p className="mt-2 text-slate-500">
          Возможно, ссылка устарела или адрес введён с ошибкой.
        </p>
      </div>
      <div className="flex gap-3">
        <LinkButton to="/app">В приложение</LinkButton>
        <LinkButton to="/" variant="outline">
          На главную
        </LinkButton>
      </div>
      <Link to="/app/mentors" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        Посмотреть каталог наставников
      </Link>
    </div>
  );
}
