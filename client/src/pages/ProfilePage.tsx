import { useEffect, useState, type FormEvent } from 'react';
import { Award, Coins, Save, Target, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMeta } from '@/lib/useMeta';
import type { Me } from '@/lib/types';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DemoBadge,
  Field,
  Input,
  Progress,
  Select,
  Stat,
  Textarea,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { TagInput } from '@/components/TagInput';
import { formatFullDate, ROLE_LABELS } from '@/lib/format';

export function ProfilePage() {
  const { me, refresh } = useAuth();
  const { meta } = useMeta();

  const [form, setForm] = useState({
    display_name: '',
    city: '',
    headline: '',
    bio: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setForm({
      display_name: me.profile.display_name,
      city: me.profile.city,
      headline: me.profile.headline,
      bio: me.profile.bio,
    });
    setSkills(me.profile.skills);
    setInterests(me.profile.interests);
  }, [me]);

  if (!me) return null;
  const { profile, level, balance, earned, stats } = me;
  const isMentor = profile.role === 'mentor';

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (form.display_name.trim().length < 2) {
      setError('Имя должно содержать минимум 2 символа');
      return;
    }
    setSaving(true);
    try {
      await api.patch<Me>('/me', {
        display_name: form.display_name.trim(),
        city: form.city.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        skills,
        interests,
      });
      await refresh();
      setNotice('Профиль сохранён');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Мой профиль" description="Расскажите о себе — это помогает другим понять, чем вы можете помочь." />

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile.display_name} size={72} src={profile.avatar_url} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{profile.display_name}</h1>
              <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                {ROLE_LABELS[profile.role]}
              </Badge>
              {profile.is_demo && <DemoBadge />}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {profile.headline || 'Краткое описание не заполнено'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              На платформе с {formatFullDate(profile.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-700">{balance}</p>
            <p className="text-xs text-slate-500">баллов на балансе</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Уровень" value={level.name} icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Заработано" value={earned} icon={<Coins className="h-4 w-4" />} />
        <Stat
          label={isMentor ? 'Сессий проведено' : 'Сессий посещено'}
          value={isMentor ? stats.sessions_completed : stats.sessions_as_learner}
        />
        <Stat label="Миссий зачтено" value={stats.missions_completed} icon={<Target className="h-4 w-4" />} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Прогресс до следующего уровня</p>
          <Badge className="bg-teal-50 text-teal-700 ring-teal-200">{level.name}</Badge>
        </div>
        <Progress value={level.progress} className="mt-3" />
        <p className="mt-2 text-xs text-slate-500">
          {level.nextName
            ? `${earned} / ${level.nextAt} — до «${level.nextName}» осталось ${(level.nextAt ?? 0) - earned}`
            : 'Максимальный уровень достигнут'}
        </p>
      </Card>

      <Card>
        <CardHeader title="Редактировать профиль" icon={<Award className="h-4 w-4" />} />
        <form onSubmit={save} className="space-y-5 p-5">
          {error && <Alert tone="error">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Имя и фамилия" htmlFor="display_name">
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Город" htmlFor="city">
              <Select
                id="city"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              >
                <option value="">Не указано</option>
                {(meta?.cities ?? []).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={isMentor ? 'Кратко о себе' : 'Чему хотите научиться'} htmlFor="headline">
            <Input
              id="headline"
              value={form.headline}
              onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
              placeholder="Одна строка, которую увидят другие"
            />
          </Field>

          {isMentor && (
            <Field label="Навыки" hint="Введите навык и нажмите Enter">
              <TagInput value={skills} onChange={setSkills} placeholder="React, дизайн, английский…" />
            </Field>
          )}

          <Field label="Интересы" hint="Введите интерес и нажмите Enter">
            <TagInput value={interests} onChange={setInterests} placeholder="Стартапы, музыка…" />
          </Field>

          <Field label="О себе" htmlFor="bio">
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Опыт, цели, чем можете помочь"
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Сохранить
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
