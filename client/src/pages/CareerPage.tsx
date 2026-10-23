import { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, FileText, MapPin, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, Badge, Button, Card, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { DEMO_COURSES, useLearningProgress } from '@/lib/learning';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface DemoCompany {
  id: string;
  name: string;
  type: string;
  location: string;
  about: string;
  requirements: string[];
  openings: number;
  courseId: string;
}

const DEMO_COMPANIES: DemoCompany[] = [
  {
    id: 'c1',
    name: 'NovaTech KG',
    type: 'IT-компания',
    location: 'Бишкек / Гибрид',
    about: 'Набирает молодых разработчиков с практическими навыками в команду.',
    requirements: ['Базовое понимание веба', 'Готовность к обучению', 'Командная работа'],
    openings: 3,
    courseId: 'web-basics',
  },
  {
    id: 'c2',
    name: 'LinguaBridge',
    type: 'Языковая школа',
    location: 'Бишкек',
    about: 'Набирает молодых преподавателей английского языка для разговорных групп.',
    requirements: ['Базовый английский (демо-курс)', 'Педагогический интерес', 'Ответственность'],
    openings: 4,
    courseId: 'english-basics',
  },
  {
    id: 'c3',
    name: 'EduPath International',
    type: 'Образование за рубежом',
    location: 'Удалённо / Бишкек',
    about: 'Помогает студентам с подготовкой к программам обучения за рубежом, ищет молодых консультантов.',
    requirements: ['Пройти вводный демо-курс английского', 'Коммуникабельность', 'Внимательность к деталям'],
    openings: 2,
    courseId: 'english-basics',
  },
  {
    id: 'c4',
    name: 'StartUpLab KG',
    type: 'Стартап-инкубатор',
    location: 'Бишкек',
    about: 'Ищет практикантов в маркетинг/продажи с желанием развиваться.',
    requirements: ['Активность', 'Базовые навыки коммуникации', 'Готовность к практике'],
    openings: 5,
    courseId: 'marketing-basics',
  },
];

export function CareerPage() {
  const { me } = useAuth();
  const toast = useToast();
  const { progress, error } = useLearningProgress(me?.profile.id ?? '');
  const [selected, setSelected] = useState<DemoCompany | null>(null);
  const [consent, setConsent] = useState(false);

  const completedCount = Object.keys(progress.completedCourses).length;

  function submit() {
    toast.success('Демо-отклик показан. Никакие данные никуда не отправлены.');
    setSelected(null);
    setConsent(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Карьера"
        description="Следующий шаг после бесплатной базы, мини-заданий и углублённого обучения."
      />

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-teal-50 p-5">
        <p className="font-semibold text-slate-900">Маршрут к первой возможности</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: `Бесплатная база · ${completedCount}/${DEMO_COURSES.length}`, done: completedCount === DEMO_COURSES.length },
            { label: 'Практика навыков', done: completedCount > 0 },
            { label: 'Углублённое обучение', done: false },
            { label: 'Стажировка или работа', done: false },
          ].map((step, index) => (
            <div key={step.label} className="flex items-center gap-2 rounded-xl bg-white/80 p-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span className="text-xs font-medium text-slate-700">{step.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Демо-прогресс в бесплатной базе: {completedCount} из {DEMO_COURSES.length} мини-курсов.
          Следующие этапы требуют реальных партнёров и программ.
        </p>
      </Card>

      <Card className="border-dashed">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Демонстрационные карточки компаний</p>
              <p className="text-sm text-slate-500">
                Все названия, вакансии и количества мест вымышлены для презентации. Реальных партнёрств пока нет.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Демо-режим</Badge>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link to="/app/paid-lessons">
          <Button variant="outline">К бесплатной базе и курсам <ArrowRight className="h-4 w-4" /></Button>
        </Link>
        <Link to="/app/skills">
          <Button variant="outline">Показать навыки <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {DEMO_COMPANIES.map((company) => (
          <Card key={company.id} className="flex flex-col">
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={company.name} size={44} />
                  <div>
                    <p className="text-base font-semibold text-slate-900">{company.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge>{company.type}</Badge>
                      <Badge className="bg-amber-50 text-amber-700 ring-amber-200">Вымышленная компания</Badge>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {company.location}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                  <Users className="mr-1 h-3.5 w-3.5" />
                  {company.openings} вакантных
                </Badge>
              </div>

              <p className="text-sm text-slate-600">{company.about}</p>

              <div>
                <p className="text-sm font-medium text-slate-900">Требования</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {company.requirements.map((req) => (
                    <Badge key={req} className="bg-slate-100 text-slate-700 ring-slate-200">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                {progress.completedCourses[company.courseId] ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-teal-700">Демо-требование по базе выполнено</p>
                    <Button onClick={() => setSelected(company)}>
                      <FileText className="h-4 w-4" />
                      Демо-отклик
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Сначала пройдите: {DEMO_COURSES.find((course) => course.id === company.courseId)?.title}
                    </p>
                    <Link
                      to={`/app/free-courses/${company.courseId}`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      К курсу <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setConsent(false);
        }}
        title="Отклик на стажировку (демо)"
        description={selected ? `${selected.name} • ${selected.type}` : undefined}
      >
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Минимальный набор данных</p>
            <ul className="mt-2 space-y-1">
              <li>• Направление обучения</li>
              <li>• Рейтинг навыков ученика (проверенные задания)</li>
              <li>• Информация о пройденной базе</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">Email, телефон и прочие контакты передаваться не будут.</p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">
              Я согласен показать демонстрационный отклик в прототипе. Реальная передача данных не выполняется.
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setSelected(null);
                setConsent(false);
              }}
            >
              Отмена
            </Button>
            <Button disabled={!consent} onClick={submit}>
              Отправить отклик (демо)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
