import { useState } from 'react';
import { CheckCircle2, Clock, Send, Target, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/lib/auth';
import type { Mission } from '@/lib/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Spinner,
  Textarea,
} from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  formatDate,
  PARTICIPATION_LABELS,
  pluralize,
} from '@/lib/format';

export function MissionsPage() {
  const { refresh } = useAuth();
  const missions = useAsync<Mission[]>(() => api.get<Mission[]>('/missions'), []);
  const [active, setActive] = useState<Mission | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function join(mission: Mission) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.post(`/missions/${mission.id}/join`, {});
      setNotice(`Вы присоединились к миссии «${mission.title}»`);
      await missions.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось присоединиться');
    } finally {
      setBusy(false);
    }
  }

  function openSubmit(mission: Mission) {
    setActive(mission);
    setText(mission.participation?.submission_text ?? '');
    setError(null);
  }

  async function submit() {
    if (!active) return;
    setError(null);
    if (text.trim().length < 20) {
      setError('Опишите результат подробнее (минимум 20 символов)');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/missions/${active.id}/submit`, { submission_text: text.trim() });
      setActive(null);
      setNotice('Отчёт отправлен на проверку администратору');
      await missions.reload();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить отчёт');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Миссии"
        description="Практические задания с наградой. Присоединяйтесь, выполняйте и отправляйте результат на проверку."
      />

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && !active && <Alert tone="error">{error}</Alert>}

      {missions.loading && <Spinner />}
      {missions.error && (
        <ErrorState message={missions.error} onRetry={() => void missions.reload()} />
      )}

      {missions.data && missions.data.length === 0 && (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="Активных миссий нет"
          description="Загляните позже — новые задания появляются регулярно."
        />
      )}

      {missions.data && missions.data.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {missions.data.map((mission) => {
            const participation = mission.participation;
            const status = participation?.status;
            return (
              <Card key={mission.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={DIFFICULTY_STYLES[mission.difficulty]}>
                      {DIFFICULTY_LABELS[mission.difficulty]}
                    </Badge>
                    {status && (
                      <Badge
                        className={
                          status === 'approved'
                            ? 'bg-teal-50 text-teal-700 ring-teal-200'
                            : status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 ring-rose-200'
                              : 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                        }
                      >
                        {PARTICIPATION_LABELS[status]}
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 rounded-xl bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700">
                    +{mission.reward_points}
                  </span>
                </div>

                <h3 className="mt-3 font-semibold text-slate-900">{mission.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{mission.description}</p>

                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Что нужно: </span>
                  {mission.criteria}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {mission.participants_count}{' '}
                    {pluralize(mission.participants_count, 'участник', 'участника', 'участников')}
                  </span>
                  {mission.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      до {formatDate(mission.deadline)}
                    </span>
                  )}
                </div>

                {participation?.review_note && (
                  <p className="mt-3 text-xs text-slate-500">
                    <span className="font-medium">Комментарий проверяющего: </span>
                    {participation.review_note}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {!participation && (
                    <Button loading={busy} onClick={() => join(mission)}>
                      Присоединиться
                    </Button>
                  )}
                  {participation && status === 'joined' && (
                    <Button onClick={() => openSubmit(mission)}>
                      <Send className="h-4 w-4" />
                      Отправить результат
                    </Button>
                  )}
                  {participation && status === 'submitted' && (
                    <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                      <Clock className="h-3.5 w-3.5" />
                      Ожидает проверки администратора
                    </Badge>
                  )}
                  {participation && status === 'approved' && (
                    <Badge className="bg-teal-50 text-teal-700 ring-teal-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Зачтено · +{mission.reward_points} баллов
                    </Badge>
                  )}
                  {participation && status === 'rejected' && (
                    <Badge className="bg-rose-50 text-rose-700 ring-rose-200">
                      Отклонено
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active ? `Отчёт: ${active.title}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setActive(null)}>
              Отмена
            </Button>
            <Button onClick={submit} loading={busy}>
              Отправить на проверку
            </Button>
          </>
        }
      >
        {active && (
          <>
            <p className="text-sm text-slate-500">
              Опишите, что вы сделали и приложите ссылку на результат. Критерии:{' '}
              <span className="text-slate-700">{active.criteria}</span>
            </p>
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Результат" htmlFor="submission">
              <Textarea
                id="submission"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Что сделано, какая ссылка на результат, чему научились"
                className="min-h-[140px]"
              />
            </Field>
          </>
        )}
      </Modal>
    </div>
  );
}
