import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Alert, Button, Field, Input } from '@/components/ui';
import { AuthLayout, AuthSwitch } from './AuthLayout';

const DEMO_ACCOUNTS = [
  { label: 'Ученик', email: 'learner@ustaz.kg', password: 'Demo1234!' },
  { label: 'Наставник', email: 'aigerim@ustaz.kg', password: 'Demo1234!' },
  { label: 'Администратор', email: 'admin@ustaz.kg', password: 'Admin1234!' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  return (
    <AuthLayout
      title="Вход в USTAZ"
      subtitle="Войдите, чтобы бронировать сессии, выполнять миссии и обменивать баллы."
      footer={<AuthSwitch text="Ещё нет аккаунта?" to="/register" label="Зарегистрироваться" />}
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Пароль" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          <LogIn className="h-4 w-4" />
          Войти
        </Button>
      </form>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Демо-аккаунты для презентации
        </p>
        <div className="mt-3 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm ring-1 ring-slate-200 transition-colors hover:ring-indigo-300"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-slate-900">{account.label}</span>
                <span className="ml-2 text-slate-500">{account.email}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-indigo-600">Заполнить</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
