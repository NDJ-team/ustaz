export interface PaidLesson {
  id: string;
  title: string;
  mentor: string;
  mentorStatus: 'Проверенный ментор' | 'Рекомендуемый';
  direction: string;
  price: number;
  duration: number;
  level: string;
  format: 'Персональный урок' | 'Курс с заданиями';
  rating: number;
  reviews: number;
  relatedCourseIds: string[];
}

export const DEMO_LESSONS: PaidLesson[] = [
  {
    id: 'pl-1',
    title: 'Основы фронтенда: HTML/CSS/JS с практикой',
    mentor: 'Алихан Токтосунов',
    mentorStatus: 'Рекомендуемый',
    direction: 'IT',
    price: 1499,
    duration: 60,
    level: 'Стартовый',
    format: 'Персональный урок',
    rating: 4.9,
    reviews: 28,
    relatedCourseIds: ['web-basics'],
  },
  {
    id: 'pl-2',
    title: 'Разбор задач и подготовка к собеседованию',
    mentor: 'Нуржамал Касымова',
    mentorStatus: 'Проверенный ментор',
    direction: 'IT',
    price: 1299,
    duration: 60,
    level: 'Средний',
    format: 'Персональный урок',
    rating: 4.9,
    reviews: 19,
    relatedCourseIds: ['web-basics'],
  },
  {
    id: 'pl-3',
    title: 'Английский для старта: разговор + практика',
    mentor: 'Айгуль Садыкова',
    mentorStatus: 'Проверенный ментор',
    direction: 'Языки',
    price: 899,
    duration: 45,
    level: 'Стартовый',
    format: 'Персональный урок',
    rating: 4.8,
    reviews: 16,
    relatedCourseIds: ['english-basics'],
  },
  {
    id: 'pl-4',
    title: 'Курс: База по вебу + мини-проекты',
    mentor: 'Эрмек Бакытов',
    mentorStatus: 'Рекомендуемый',
    direction: 'IT',
    price: 1999,
    duration: 90,
    level: 'Стартовый',
    format: 'Курс с заданиями',
    rating: 5.0,
    reviews: 12,
    relatedCourseIds: ['web-basics'],
  },
  {
    id: 'pl-5',
    title: 'Практический курс по тестированию веб-приложений',
    mentor: 'Тимур Сарбашев',
    mentorStatus: 'Рекомендуемый',
    direction: 'Тестирование и QA',
    price: 1590,
    duration: 75,
    level: 'Стартовый',
    format: 'Курс с заданиями',
    rating: 4.8,
    reviews: 11,
    relatedCourseIds: ['qa-basics'],
  },
  {
    id: 'pl-6',
    title: 'Аналитика данных на практических примерах',
    mentor: 'Нурсултан Бектуров',
    mentorStatus: 'Рекомендуемый',
    direction: 'Аналитика данных',
    price: 1790,
    duration: 90,
    level: 'Стартовый',
    format: 'Курс с заданиями',
    rating: 4.9,
    reviews: 9,
    relatedCourseIds: ['data-basics'],
  },
  {
    id: 'pl-7',
    title: 'Первое мобильное приложение: план и прототип',
    mentor: 'Алихан Токтосунов',
    mentorStatus: 'Рекомендуемый',
    direction: 'Мобильная разработка',
    price: 1690,
    duration: 60,
    level: 'Стартовый',
    format: 'Персональный урок',
    rating: 4.8,
    reviews: 8,
    relatedCourseIds: ['mobile-basics'],
  },
];
