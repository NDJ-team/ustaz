import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Gift, UserPlus, Users } from 'lucide-react';
import { useAuth, type RegisterPayload } from '@/lib/auth';
import { useMeta } from '@/lib/useMeta';
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { TagInput } from '@/components/TagInput';
import { AuthLayout, AuthSwitch } from './AuthLayout';

export function RegisterPage() {
  const { register } = useAuth();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref')?.trim() ?? '';

  const [role, setRole] = useState<'learner' | 'mentor'>('learner');
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
    city: '',
    headline: '',
    bio: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    const payload: RegisterPayload = {
      display_name: form.display_name.trim(),
      email: form.email.trim(),
      password: form.password,
      role,
      city: form.city.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      interests,
      skills: role === 'mentor' ? skills : [],
      ...(referralCode ? { ref: referralCode } : {}),
    };

    setLoading(true);
    try {
      await register(payload);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  }

  const roleCards: Array<{
    id: 'learner' | 'mentor';
    icon: typeof Users;
    title: string;
    text: string;
  }> = [
    {
      id: 'learner',
      icon: GraduationCap,
      title: 'Я ученик',
      text: 'Ищу наставника, бронирую сессии, выполняю миссии.',
    },
    {
      id: 'mentor',
      icon: Users,
      title: 'Я наставник',
      text: 'Делюсь опытом, провожу консультации, зарабатываю баллы.',
    },
  ];

  return (
    <AuthLayout
      title="Создать аккаунт"
      subtitle="Присоединяйтесь к сообществу взаимного наставничества Кыргызстана."
      footer={<AuthSwitch text="Уже есть аккаунт?" to="/login" label="Войти" />}
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {referralCode && (
          <Alert tone="info">
            <span className="flex items-start gap-2">
              <Gift className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Вы регистрируетесь по приглашению. После создания аккаунта пригласивший получит
                бонусные баллы.
              </span>
            </span>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {roleCards.map((card) => {
            const Icon = card.icon;
            const active = role === card.id;
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => setRole(card.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <p className="mt-2 font-semibold text-slate-900">{card.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{card.text}</p>
              </button>
            );
          })}
        </div>

        <Field label="Имя и фамилия" htmlFor="name">
          <Input
            id="name"
            required
            minLength={2}
            value={form.display_name}
            onChange={(e) => update('display_name', e.target.value)}
            placeholder="Айгерим Кыдырова"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Пароль" htmlFor="password" hint="Минимум 8 символов">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Город" htmlFor="city">
          <Select id="city" value={form.city} onChange={(e) => update('city', e.target.value)}>
            <option value="">Не указано</option>
            {(meta?.cities ?? []).map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={role === 'mentor' ? 'Кратко о себе' : 'Чему хотите научиться'}
          htmlFor="headline"
          hint="Одна строка, которую увидят другие"
        >
          <Input
            id="headline"
            value={form.headline}
            onChange={(e) => update('headline', e.target.value)}
            placeholder={
              role === 'mentor'
                ? 'Frontend-разработчица, помогаю с React'
                : 'Хочу научиться frontend-разработке'
            }
          />
        </Field>

        {role === 'mentor' && (
          <Field label="Навыки" hint="Введите навык и нажмите Enter. До 10 навыков.">
            <TagInput value={skills} onChange={setSkills} placeholder="React, дизайн, английский…" />
          </Field>
        )}

        <Field label="Интересы" hint="Введите интерес и нажмите Enter.">
          <TagInput value={interests} onChange={setInterests} placeholder="Стартапы, музыка…" />
        </Field>

        <Field label="О себе" htmlFor="bio" hint="Необязательно">
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            placeholder="Пара предложений о вашем опыте и целях"
          />
        </Field>

        <Button type="submit" className="w-full" loading={loading}>
          <UserPlus className="h-4 w-4" />
          Зарегистрироваться
        </Button>

        <p className="text-center text-xs text-slate-500">
          Продолжая, вы соглашаетесь на обработку данных в рамках учебного проекта.
        </p>
      </form>
    </AuthLayout>
  );
}
