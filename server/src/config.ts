/**
 * Единая конфигурация экономики USTAZ.
 * Все числовые правила хранятся здесь, а не в компонентах или роутах.
 */
export const POINTS = {
  /** Награда наставнику за подтверждённую обеими сторонами сессию */
  sessionReward: 100,
  /** Бонус за серию занятий (начисляется администратором) */
  streakBonus: 50,
  /** Бонус пригласившему за друга, зарегистрировавшегося по ссылке */
  referralBonus: 50,
  /** Демонстрационный бонус ученику при seed — явно помечен как демо */
  demoLearnerBonus: 300,
} as const;

/**
 * Лимиты попыток для чувствительных эндпоинтов.
 * Ключ для входа — IP + email, поэтому перебор одного аккаунта не блокирует
 * остальных пользователей с того же адреса.
 */
export const RATE_LIMITS = {
  /** Окно наблюдения для входа */
  loginWindowMs: 10 * 60 * 1000,
  /** Неудачных попыток входа на один IP + email */
  loginPerAccount: 8,
  /** Неудачных попыток входа с одного IP суммарно */
  loginPerIp: 40,
  /** Окно наблюдения для регистрации */
  registerWindowMs: 60 * 60 * 1000,
  /** Попыток регистрации на один IP + email */
  registerPerAccount: 10,
  /** Попыток регистрации с одного IP суммарно */
  registerPerIp: 30,
} as const;

export const PLATFORM = {
  name: 'USTAZ',
  slogan: 'Делись знаниями. Расти вместе.',
  sessionMinutes: 45,
  currencyNote: 'USTAZ Points — внутренние баллы репутации, не деньги и не криптовалюта.',
} as const;

export const LEVELS = [
  { name: 'Новичок', minPoints: 0 },
  { name: 'Помощник', minPoints: 200 },
  { name: 'Наставник', minPoints: 600 },
  { name: 'Эксперт сообщества', minPoints: 1500 },
] as const;

export function levelFor(earnedPoints: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (earnedPoints >= LEVELS[i].minPoints) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next
    ? Math.min(1, Math.max(0, (earnedPoints - current.minPoints) / (next.minPoints - current.minPoints)))
    : 1;

  return {
    name: current.name,
    index,
    earned: earnedPoints,
    nextName: next?.name ?? null,
    nextAt: next?.minPoints ?? null,
    progress,
  };
}

export const CATEGORIES = [
  { id: 'programming', label: 'Программирование и разработка' },
  { id: 'design', label: 'Дизайн' },
  { id: 'marketing', label: 'Маркетинг' },
  { id: 'exam-prep', label: 'Подготовка к экзаменам' },
  { id: 'spoken-language', label: 'Разговорный язык' },
  { id: 'english', label: 'Иностранные языки' },
  { id: 'music-vocal', label: 'Музыка и вокал' },
  { id: 'photo-video', label: 'Фотография и видео' },
  { id: 'art-drawing', label: 'Рисование и арт' },
  { id: 'graduation-prep', label: 'Подготовка к выпускным экзаменам' },
  { id: 'public-speaking', label: 'Ораторское мастерство и публичные выступления' },
  { id: 'smm-content', label: 'SMM и контент' },
  { id: 'business', label: 'Бизнес и стартапы' },
  { id: 'interview', label: 'Карьера и собеседования' },
  { id: 'it-data', label: 'IT и Data' },
  { id: 'career', label: 'Карьера и портфолио' },
  { id: 'math', label: 'Математика' },
  { id: '3d-modeling', label: '3D-моделирование' },
  { id: 'robotics', label: 'Робототехника' },
  { id: 'soft-skills', label: 'Soft skills' },
] as const;
