import { useCallback, useEffect, useState } from 'react';

export interface DemoCourse {
  id: string;
  title: string;
  direction: string;
  description: string;
  level: string;
  lessonTitle: string;
  lesson: string[];
  task: string;
  options: Array<{ id: string; label: string }>;
  correctOption: string;
}

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: 'web-basics',
    title: 'Веб-разработка: первые шаги',
    direction: 'IT',
    description: 'HTML, CSS и основы JavaScript с небольшим итоговым проектом.',
    level: 'С нуля',
    lessonTitle: 'Как устроена HTML-страница',
    lesson: [
      'HTML описывает структуру страницы: заголовки, абзацы, ссылки и изображения.',
      'Для основного заголовка используют тег <h1>, для абзаца — <p>, а для ссылки — <a>.',
      'Браузер читает HTML-разметку и строит из неё содержимое страницы. Внешний вид обычно задают стилями CSS.',
    ],
    task: 'Какой HTML-тег подходит для главного заголовка страницы?',
    options: [
      { id: 'p', label: '<p>' },
      { id: 'h1', label: '<h1>' },
      { id: 'a', label: '<a>' },
    ],
    correctOption: 'h1',
  },
  {
    id: 'english-basics',
    title: 'Английский для учёбы и общения',
    direction: 'Английский',
    description: 'Базовые фразы, знакомство и короткие диалоги для практики.',
    level: 'A1–A2',
    lessonTitle: 'Как представиться',
    lesson: [
      'Фраза “My name is…” помогает назвать своё имя.',
      'Чтобы спросить имя собеседника, скажите “What is your name?”.',
      'В коротком знакомстве можно добавить “Nice to meet you” — «Приятно познакомиться».',
    ],
    task: 'Как правильно сказать «Меня зовут Айдана»?',
    options: [
      { id: 'my-name', label: 'My name is Aidana.' },
      { id: 'i-name', label: 'I name Aidana.' },
      { id: 'name-are', label: 'Name are Aidana.' },
    ],
    correctOption: 'my-name',
  },
  {
    id: 'design-basics',
    title: 'Основы цифрового дизайна',
    direction: 'Дизайн',
    description: 'Композиция, цвет и первый экран приложения.',
    level: 'С нуля',
    lessonTitle: 'Визуальная иерархия',
    lesson: [
      'Визуальная иерархия помогает понять, на что смотреть в первую очередь.',
      'Размер, контраст и расположение элементов подсказывают их важность.',
      'На одном экране лучше выделить один главный заголовок и одно основное действие.',
    ],
    task: 'Как лучше всего выделить главное действие на экране?',
    options: [
      { id: 'same', label: 'Сделать все кнопки одинаково заметными' },
      { id: 'contrast', label: 'Использовать заметный контраст для основной кнопки' },
      { id: 'hide', label: 'Спрятать кнопку внизу мелким текстом' },
    ],
    correctOption: 'contrast',
  },
  {
    id: 'marketing-basics',
    title: 'Основы цифрового маркетинга',
    direction: 'Маркетинг',
    description: 'Аудитория, ценность предложения и первые идеи для продвижения.',
    level: 'С нуля',
    lessonTitle: 'Для кого продукт?',
    lesson: [
      'Перед продвижением важно понять, кому именно помогает продукт.',
      'Описание аудитории включает потребность, контекст и цель человека.',
      'Чёткая ценность объясняет, какую задачу продукт решает для этой аудитории.',
    ],
    task: 'Что лучше определить в первую очередь перед запуском продвижения?',
    options: [
      { id: 'audience', label: 'Кому продукт помогает и какую задачу решает' },
      { id: 'colors', label: 'Цвет всех публикаций на год' },
      { id: 'budget', label: 'Самый большой рекламный бюджет' },
    ],
    correctOption: 'audience',
  },
  {
    id: 'data-basics',
    title: 'Аналитика данных: первые шаги',
    direction: 'Аналитика данных',
    description: 'Таблицы, вопросы к данным и простые выводы.',
    level: 'С нуля',
    lessonTitle: 'Данные помогают отвечать на вопросы',
    lesson: [
      'Перед анализом сформулируйте вопрос: например, какой формат занятия выбирают чаще.',
      'Таблица хранит наблюдения в строках и характеристики в столбцах.',
      'Вывод должен опираться на данные и не утверждать больше, чем они показывают.',
    ],
    task: 'Какой шаг лучше сделать до расчёта показателей?',
    options: [
      { id: 'question', label: 'Сформулировать вопрос, на который нужен ответ' },
      { id: 'chart', label: 'Сразу выбрать самый яркий график' },
      { id: 'guess', label: 'Заранее решить, каким должен быть вывод' },
    ],
    correctOption: 'question',
  },
  {
    id: 'qa-basics',
    title: 'Тестирование цифровых продуктов',
    direction: 'Тестирование и QA',
    description: 'Как проверять сценарии и понятно описывать найденные ошибки.',
    level: 'С нуля',
    lessonTitle: 'Хороший отчёт об ошибке',
    lesson: [
      'Отчёт об ошибке помогает другому человеку повторить проблему.',
      'Запишите шаги, ожидаемый результат и то, что произошло на самом деле.',
      'Добавьте только нужные детали: среду, сообщение или снимок экрана.',
    ],
    task: 'Что важнее всего для воспроизведения ошибки?',
    options: [
      { id: 'steps', label: 'Чёткие шаги и фактический результат' },
      { id: 'opinion', label: 'Только мнение, что приложение неудобное' },
      { id: 'color', label: 'Название любимого цвета интерфейса' },
    ],
    correctOption: 'steps',
  },
  {
    id: 'mobile-basics',
    title: 'Мобильные приложения: основы',
    direction: 'Мобильная разработка',
    description: 'Пользовательские сценарии, экраны и доступность на телефоне.',
    level: 'С нуля',
    lessonTitle: 'Начните с задачи пользователя',
    lesson: [
      'Экран мобильного приложения должен помогать человеку выполнить конкретную задачу.',
      'Основное действие должно быть заметным и доступным для нажатия.',
      'Проверяйте интерфейс на небольшом экране и учитывайте состояние загрузки и ошибки.',
    ],
    task: 'Что стоит проверить перед выпуском мобильного экрана?',
    options: [
      { id: 'small', label: 'Читаемость и удобство на небольшом экране' },
      { id: 'desktop', label: 'Только вид на широком мониторе' },
      { id: 'animation', label: 'Только количество анимаций' },
    ],
    correctOption: 'small',
  },
  {
    id: 'product-basics',
    title: 'Основы управления продуктом',
    direction: 'Управление продуктом',
    description: 'Проблема пользователя, гипотеза и простой способ её проверить.',
    level: 'С нуля',
    lessonTitle: 'Сначала проблема, затем решение',
    lesson: [
      'Продуктовая работа начинается с понимания проблемы конкретного пользователя.',
      'Гипотеза описывает ожидаемое изменение поведения после решения.',
      'Небольшой тест помогает проверить гипотезу до дорогой разработки.',
    ],
    task: 'Какой подход лучше для проверки новой идеи?',
    options: [
      { id: 'test', label: 'Проверить небольшую гипотезу с пользователями' },
      { id: 'build-all', label: 'Сразу разработать все возможные функции' },
      { id: 'assume', label: 'Не спрашивать пользователей и полагаться на догадки' },
    ],
    correctOption: 'test',
  },
  {
    id: 'finance-basics',
    title: 'Личная финансовая грамотность',
    direction: 'Финансовая грамотность',
    description: 'Доходы, расходы и планирование доступного бюджета.',
    level: 'С нуля',
    lessonTitle: 'Простой план бюджета',
    lesson: [
      'Бюджет помогает сравнить регулярные доходы и расходы за один период.',
      'Перед покупкой полезно учесть обязательные расходы и отложенные цели.',
      'Планирование не гарантирует доход, но помогает принимать более осознанные решения.',
    ],
    task: 'Что нужно учесть перед покупкой курса?',
    options: [
      { id: 'budget', label: 'Обязательные расходы и доступный бюджет' },
      { id: 'trend', label: 'Только популярность курса' },
      { id: 'loan', label: 'Сразу взять долг, не оценивая условия' },
    ],
    correctOption: 'budget',
  },
  {
    id: 'teaching-basics',
    title: 'Как объяснять и помогать учиться',
    direction: 'Преподавание и репетиторство',
    description: 'Цель занятия, простое объяснение и проверка понимания.',
    level: 'С нуля',
    lessonTitle: 'Объяснение через цель и практику',
    lesson: [
      'В начале занятия полезно договориться, чему ученик хочет научиться.',
      'Разбейте сложную тему на небольшие шаги и покажите пример.',
      'Попросите ученика применить идею самостоятельно и задайте уточняющий вопрос.',
    ],
    task: 'Как понять, что ученик усвоил объяснение?',
    options: [
      { id: 'practice', label: 'Предложить применить идею и объяснить ход решения' },
      { id: 'repeat', label: 'Повторить объяснение громче' },
      { id: 'skip', label: 'Сразу перейти к следующей теме' },
    ],
    correctOption: 'practice',
  },
  {
    id: 'cyber-safety-basics',
    title: 'Цифровая безопасность для начинающих',
    direction: 'Кибербезопасность',
    description: 'Пароли, многофакторная защита и внимательность к ссылкам.',
    level: 'С нуля',
    lessonTitle: 'Защита аккаунта',
    lesson: [
      'Для разных сервисов используйте уникальные длинные пароли.',
      'Многофакторная аутентификация добавляет дополнительный шаг проверки входа.',
      'Не вводите пароль по ссылке из неожиданного сообщения — откройте сервис самостоятельно.',
    ],
    task: 'Как безопаснее открыть важный сервис?',
    options: [
      { id: 'link', label: 'Найти адрес сервиса самостоятельно, не переходя по неожиданной ссылке' },
      { id: 'reply', label: 'Отправить пароль в ответ на сообщение' },
      { id: 'same-password', label: 'Использовать один пароль везде' },
    ],
    correctOption: 'link',
  },
];

export interface LearningResult {
  score: number;
  completed_at: string;
}

export interface LearningProgress {
  completedCourses: Record<string, LearningResult>;
}

const emptyProgress: LearningProgress = { completedCourses: {} };
const STORAGE_PREFIX = 'ustaz.learning.demo.';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isLearningProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== 'object' || !('completedCourses' in value)) return false;
  const courses = value.completedCourses;
  if (!courses || typeof courses !== 'object' || Array.isArray(courses)) return false;

  return Object.entries(courses).every(
    ([courseId, result]) =>
      DEMO_COURSES.some((course) => course.id === courseId) &&
      !!result &&
      typeof result === 'object' &&
      'score' in result &&
      typeof result.score === 'number' &&
      result.score >= 0 &&
      result.score <= 10 &&
      'completed_at' in result &&
      typeof result.completed_at === 'string'
  );
}

export function useLearningProgress(userId: string) {
  const [progress, setProgress] = useState<LearningProgress>(emptyProgress);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(userId));
      if (!stored) {
        setProgress(emptyProgress);
        setError(null);
        return;
      }
      const parsed: unknown = JSON.parse(stored);
      if (!isLearningProgress(parsed)) {
        throw new Error('Сохранённый демо-прогресс курса имеет неверный формат.');
      }
      setProgress(parsed);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить демо-прогресс.');
    }
  }, [userId]);

  const completeCourse = useCallback(
    (courseId: string, score: number): boolean => {
      const next: LearningProgress = {
        completedCourses: {
          ...progress.completedCourses,
          [courseId]: { score, completed_at: new Date().toISOString() },
        },
      };
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
        setProgress(next);
        setError(null);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Не удалось сохранить демо-прогресс.');
        return false;
      }
    },
    [progress, userId]
  );

  return { progress, error, completeCourse };
}
