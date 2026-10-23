import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, CircleHelp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Alert, Badge, Button, Card, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { DEMO_COURSES, useLearningProgress } from '@/lib/learning';

export function CourseDetailPage() {
  const { courseId } = useParams();
  const { me } = useAuth();
  const course = DEMO_COURSES.find((item) => item.id === courseId);
  const userId = me?.profile.id ?? '';
  const { progress, error, completeCourse } = useLearningProgress(userId);
  const [selectedOption, setSelectedOption] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [completedNow, setCompletedNow] = useState(false);

  if (!course) {
    return (
      <EmptyState
        title="Курс не найден"
        description="Выберите один из доступных демонстрационных курсов."
        action={
          <Link to="/app/free-courses">
            <Button variant="outline">К списку курсов</Button>
          </Link>
        }
      />
    );
  }

  const activeCourse = course;
  const result = progress.completedCourses[activeCourse.id];

  function submitAnswer() {
    if (!selectedOption) {
      setAnswerError('Выберите один вариант ответа.');
      return;
    }
    if (selectedOption !== activeCourse.correctOption) {
      setAnswerError('Пока неверно. Вернитесь к материалу и попробуйте ещё раз.');
      setCompletedNow(false);
      return;
    }
    if (completeCourse(activeCourse.id, 10)) {
      setAnswerError(null);
      setCompletedNow(true);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/free-courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Все курсы
      </Link>

      <PageHeader
        title={course.title}
        description={`${course.direction} · ${course.level} · короткий демо-модуль`}
      />

      {error && <Alert tone="error">{error}</Alert>}
      <Alert tone="warning">
        Учебный прототип: ответ проверяется автоматически по одному вопросу. Это не экспертная
        проверка и не подтверждение навыка для работодателя.
      </Alert>

      {result && (
        <Alert tone="success">
          {completedNow ? 'Модуль пройден!' : 'Вы уже прошли этот демо-модуль.'} Результат: {result.score}/10.
          Он сохранён в этом браузере.
        </Alert>
      )}

      <Card className="p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BookOpenCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Урок</p>
            <h2 className="font-semibold text-slate-900">{course.lessonTitle}</h2>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {course.lesson.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-6 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <CircleHelp className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Мини-задание</p>
            <h2 className="mt-1 font-semibold text-slate-900">{course.task}</h2>
          </div>
        </div>

        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Выберите ответ</legend>
          {course.options.map((option) => {
            const checked = selectedOption === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  checked
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="course-answer"
                  value={option.id}
                  checked={checked}
                  onChange={() => {
                    setSelectedOption(option.id);
                    setAnswerError(null);
                  }}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </fieldset>

        {answerError && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {answerError}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Badge className="w-fit bg-amber-50 text-amber-700 ring-amber-200">
            Демо-результат, не сертификат
          </Badge>
          {result && !completedNow ? (
            <Link to="/app/skills">
              <Button>
                К моим навыкам <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button onClick={submitAnswer}>
              <CheckCircle2 className="h-4 w-4" />
              Проверить ответ
            </Button>
          )}
        </div>
        {completedNow && (
          <div className="mt-4 flex justify-end">
            <Link
              to="/app/skills"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Перейти к навыкам <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
