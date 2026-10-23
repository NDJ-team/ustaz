import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Страховка от «белого экрана»: любая ошибка рендера показывает понятный
 * экран с действиями, а не пустую страницу. Данные на сервере не теряются.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] Ошибка рендера:', error, info.componentStack);
  }

  private reload = (): void => {
    window.location.reload();
  };

  private goHome = (): void => {
    window.location.assign('/');
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">Что-то пошло не так</h1>
          <p className="mt-2 text-sm text-slate-500">
            Интерфейс столкнулся с неожиданной ошибкой. Ваши баллы и сессии сохранены на сервере —
            просто перезагрузите страницу.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-500">
              {error.message}
            </pre>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={this.reload}>
              <RefreshCw className="h-4 w-4" />
              Перезагрузить
            </Button>
            <Button variant="outline" onClick={this.goHome}>
              <Home className="h-4 w-4" />
              На главную
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
