import { Link } from 'react-router-dom';
import { Award, BookOpen, CheckCircle2, FileText, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DEMO_COURSES, useLearningProgress } from '@/lib/learning';
import { PageHeader } from '@/components/PageHeader';
import { Alert, Badge, Button, Card, CardHeader, Progress, Stat } from '@/components/ui';

export function SkillsPage() {
  const { me } = useAuth();
  const { progress, error } = useLearningProgress(me?.profile.id ?? '');
  const results = DEMO_COURSES.flatMap((course) => {
    const result = progress.completedCourses[course.id];
    return result ? [{ course, result }] : [];
  });
  const scoreTotal = results.reduce((total, item) => total + item.result.score, 0);
  const skillRating = results.length ? Math.round((scoreTotal / results.length) * 10) : 0;
  const completedCount = results.length;
  const directionsCount = new Set(results.map(({ course }) => course.direction)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои навыки"
        description="Здесь отображаются результаты мини-заданий из бесплатных демо-курсов."
        action={
          <Link to="/app/free-courses">
            <Button variant="outline">
              <BookOpen className="h-4 w-4" />
              К курсам
            </Button>
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      <Alert tone="warning">
        Результаты сохраняются только в этом браузере. Автоматическая проверка коротких вопросов —
        демонстрация, не сертификат и не независимая оценка работодателя.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Демо-рейтинг навыков" value={`${skillRating}/100`} icon={<Trophy className="h-4 w-4" />} />
        <Stat label="Заданий пройдено" value={completedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Stat label="Курсы пройдены" value={`${completedCount}/${DEMO_COURSES.length}`} icon={<FileText className="h-4 w-4" />} />
        <Stat label="Направления с результатом" value={directionsCount} icon={<Target className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader
          title="Прогресс в демо-курсах"
          subtitle={`${completedCount} из ${DEMO_COURSES.length} мини-заданий пройдено`}
          icon={<Award className="h-4 w-4" />}
        />
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Средний результат коротких тестов</p>
            <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">{skillRating}/100</Badge>
          </div>
          <Progress value={(completedCount / DEMO_COURSES.length) * 100} />
          <p className="text-xs text-slate-500">
            Показатель основан только на пройденных демо-вопросах и не является профессиональным рейтингом.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Мини-задания по направлениям"
          subtitle="Пройдите урок и ответьте на вопрос, чтобы сохранить результат"
          icon={<FileText className="h-4 w-4" />}
        />
        <div className="divide-y divide-slate-100">
          {DEMO_COURSES.map((course) => {
            const result = progress.completedCourses[course.id];
            return (
              <div
                key={course.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge>{course.direction}</Badge>
                    {result ? (
                      <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                        Пройдено автоматически · демо
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Не начато</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="text-sm font-semibold text-slate-900">
                    {result ? `${result.score}/10` : '—'}
                  </p>
                  <Link to={`/app/free-courses/${course.id}`}>
                    <Button size="sm" variant="outline">
                      {result ? 'Повторить урок' : 'Открыть урок'}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-dashed">
        <div className="p-5 text-center">
          <p className="text-sm font-semibold text-slate-900">Учебный результат ≠ рейтинг наставника</p>
          <p className="mt-1 text-sm text-slate-500">
            Рейтинг наставника формируется из отзывов после занятий. Навыки ученика здесь показаны по результатам учебных демо-заданий.
          </p>
        </div>
      </Card>
    </div>
  );
}
