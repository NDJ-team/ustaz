/**
 * Демонстрационные данные USTAZ.
 * ВНИМАНИЕ: скрипт полностью очищает таблицы и создаёт данные заново.
 * Запуск: npm run seed
 */
import 'dotenv/config';
import { migrate, db, tx } from './db';
import { hashPassword, nowIso, uid, makeCouponCode, makeReferralCode } from './utils';
import { checkAchievements } from './serialize';
import { notify } from './notify';
import { POINTS } from './config';

migrate();

const DEMO_PASSWORD = 'Demo1234!';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@ustaz.kg';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() < Date.now() + 30 * 60 * 1000) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString();
}

function pastIso(daysAgo: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function deadline(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

db.exec(`
  DELETE FROM admin_audit;
  DELETE FROM user_achievements;
  DELETE FROM reviews;
  DELETE FROM point_transactions;
  DELETE FROM referrals;
  DELETE FROM mission_participants;
  DELETE FROM reward_redemptions;
  DELETE FROM bookings;
  DELETE FROM mentor_slots;
  DELETE FROM missions;
  DELETE FROM rewards;
  DELETE FROM achievements;
  DELETE FROM notifications;
  DELETE FROM profiles;
`);

interface NewProfile {
  id: string;
  email: string;
  name: string;
  role: 'learner' | 'mentor' | 'admin';
  city: string;
  headline: string;
  bio: string;
  skills: string[];
  interests: string[];
  /** Темы, которые наставник обычно разбирает на сессиях. */
  topics?: string[];
  password: string;
  isDemo: boolean;
}

const profiles: NewProfile[] = [
  {
    id: uid(),
    email: ADMIN_EMAIL,
    name: 'Администратор USTAZ',
    role: 'admin',
    city: 'Бишкек',
    headline: 'Команда платформы',
    bio: 'Проверяет миссии и помогает разрешать спорные ситуации.',
    skills: [],
    interests: [],
    password: ADMIN_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'learner@ustaz.kg',
    name: 'Айбек Жумабеков',
    role: 'learner',
    city: 'Бишкек',
    headline: 'Студент 2 курса, изучаю frontend',
    bio: 'Учусь на прикладной информатике. Хочу собрать портфолио и найти первого наставника по React.',
    skills: [],
    interests: ['programming', 'english', 'career'],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'madina@ustaz.kg',
    name: 'Мадина Абдиева',
    role: 'learner',
    city: 'Ош',
    headline: 'Начинающий дизайнер',
    bio: 'Изучаю UI/UX и собираю первые кейсы.',
    skills: [],
    interests: ['design', 'english'],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'erjan@ustaz.kg',
    name: 'Эржан Бекзат уулу',
    role: 'learner',
    city: 'Бишкек',
    headline: 'Школьник, готовлюсь к экзаменам',
    bio: 'Интересуют математика и программирование.',
    skills: [],
    interests: ['math', 'programming'],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'aigerim@ustaz.kg',
    name: 'Айгерим Осмонова',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Frontend-разработчик, React / TypeScript',
    bio: '3 года работаю frontend-разработчиком. Помогаю новичкам пройти путь от HTML до первого React-проекта: без воды, на практических задачах и с разбором кода.',
    skills: ['programming', 'web-development', 'mobile-development', 'qa-testing', 'career'],
    interests: ['programming', 'design'],
    topics: [
      'Разбор первого React-проекта',
      'Как устроены useState и useEffect',
      'Портфолио для junior-разработчика',
      'Вёрстка адаптивного лендинга',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'daniyar@ustaz.kg',
    name: 'Данияр Асанов',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Product designer, UI/UX',
    bio: 'Проектирую интерфейсы для образовательных сервисов. На консультациях разбираем структуру экранов, дизайн-системы и портфолио для junior-позиций.',
    skills: ['design', 'career'],
    interests: ['design'],
    topics: [
      'Разбор структуры портфолио',
      'Дизайн-система с нуля',
      'UX-исследование для учебного проекта',
      'Как презентовать макет заказчику',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'aida@ustaz.kg',
    name: 'Аида Керимова',
    role: 'mentor',
    city: 'Ош',
    headline: 'Преподаватель английского языка',
    bio: '7 лет преподаю английский подросткам и студентам. Готовлю к собеседованиям, помогаю преодолеть языковой барьер и разобрать грамматику простыми словами.',
    skills: ['english', 'teaching', 'career'],
    interests: ['english'],
    topics: [
      'Преодоление языкового барьера',
      'Английский для собеседования',
      'Разбор грамматики простыми словами',
      'Практика разговорной речи',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'nursultan@ustaz.kg',
    name: 'Нурсултан Бектуров',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Основатель EdTech-стартапа',
    bio: 'Запускал два образовательных проекта. Помогу проверить идею, собрать MVP и подготовить короткий питч для инвесторов или конкурса.',
    skills: ['business', 'career', 'product-management', 'finance'],
    interests: ['business'],
    topics: [
      'Проверка идеи стартапа',
      'MVP за две недели',
      'Питч для инвестора',
      'Как собрать первую команду',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'timur@ustaz.kg',
    name: 'Тимур Сарбашев',
    role: 'mentor',
    city: 'Каракол',
    headline: 'Backend-разработчик, Node.js / PostgreSQL',
    bio: 'Работаю с высоконагруженными API. Помогаю разобраться с базами данных, архитектурой сервисов и подготовкой к техническим собеседованиям.',
    skills: ['programming', 'math', 'data-analytics', 'cybersecurity'],
    interests: ['programming', 'math'],
    topics: [
      'Подготовка к техническому интервью',
      'Проектирование схемы базы данных',
      'Работа с Git и ветками',
      'Архитектура REST API',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'asel@ustaz.kg',
    name: 'Асель Ташиева',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Маркетолог, SMM и контент',
    bio: 'Пять лет продвигаю образовательные и локальные бренды. Помогаю собрать контент-план, разобраться в аналитике и сделать первые рекламные кампании без большого бюджета.',
    skills: ['marketing', 'smm-content', 'design'],
    interests: ['marketing', 'smm-content'],
    topics: [
      'Контент-план на месяц',
      'Стратегия продвижения в Instagram',
      'Разбор рекламного креатива',
      'Аналитика соцсетей с нуля',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'bakyt@ustaz.kg',
    name: 'Бакыт Кыдыров',
    role: 'mentor',
    city: 'Ош',
    headline: 'Преподаватель математики, подготовка к ОРТ',
    bio: 'Готовлю школьников к ОРТ и выпускным экзаменам. Объясняю темы через простые примеры, помогаю выстроить план повторения и справиться с волнением на экзамене.',
    skills: ['exam-prep', 'math', 'graduation-prep'],
    interests: ['exam-prep', 'math'],
    topics: [
      'Разбор заданий ОРТ по математике',
      'План повторения перед экзаменом',
      'Типичные ошибки на выпускных экзаменах',
      'Как справляться с волнением',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'cholpon@ustaz.kg',
    name: 'Чолпон Сыдыкова',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Преподаватель разговорного английского',
    bio: 'Веду разговорные клубы для подростков и взрослых. Помогаю начать говорить без страха ошибок, расширить словарный запас и подготовиться к поездке или учёбе за рубежом.',
    skills: ['spoken-language', 'english', 'soft-skills'],
    interests: ['spoken-language', 'english'],
    topics: [
      'Разговорная практика для начинающих',
      'Подготовка к поездке за рубеж',
      'Как перестать бояться ошибок',
      'Словарный запас для повседневной речи',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'azamat@ustaz.kg',
    name: 'Азамат Исаков',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Музыкант, вокал и гитара',
    bio: 'Выступаю с группой и преподаю музыку. Помогаю поставить голос, освоить первые аккорды и подготовить первое выступление без лишнего стресса.',
    skills: ['music-vocal', 'art-drawing'],
    interests: ['music-vocal'],
    topics: [
      'Постановка голоса для начинающих',
      'Первые аккорды на гитаре',
      'Подготовка к первому выступлению',
      'Как развивать музыкальный слух',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'kamila@ustaz.kg',
    name: 'Камила Асанова',
    role: 'mentor',
    city: 'Ош',
    headline: 'Фотограф и видеограф',
    bio: 'Снимаю репортажи и портреты, монтирую короткие видео для соцсетей. На консультациях разбираем композицию, свет и то, как собрать портфолио из первых работ.',
    skills: ['photo-video', 'smm-content', 'art-drawing'],
    interests: ['photo-video', 'smm-content'],
    topics: [
      'Композиция и свет в фотографии',
      'Съёмка портрета на телефон',
      'Монтаж короткого видео',
      'Портфолио фотографа с нуля',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'ermek@ustaz.kg',
    name: 'Ермек Осмонов',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Тренер по публичным выступлениям',
    bio: 'Помогаю готовить презентации и защиты проектов. Работаем над структурой речи, волнением и тем, как удержать внимание аудитории.',
    skills: ['public-speaking', 'soft-skills', 'interview'],
    interests: ['public-speaking', 'soft-skills'],
    topics: [
      'Структура убедительной презентации',
      'Как справиться с волнением на сцене',
      'Защита школьного проекта',
      'Подготовка к собеседованию',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'adilet@ustaz.kg',
    name: 'Адилет Маматов',
    role: 'mentor',
    city: 'Бишкек',
    headline: 'Data-аналитик, Python и 3D',
    bio: 'Работаю с данными и визуализацией. Помогаю сделать первые шаги в Python, разобраться в аналитике и попробовать 3D-моделирование в учебном проекте.',
    skills: ['it-data', '3d-modeling', 'programming'],
    interests: ['it-data', '3d-modeling'],
    topics: [
      'Первый анализ данных на Python',
      'Визуализация данных для проекта',
      'Введение в 3D-моделирование',
      'Как подготовиться к стажировке в IT',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
  {
    id: uid(),
    email: 'ruslan@ustaz.kg',
    name: 'Руслан Жапаров',
    role: 'mentor',
    city: 'Каракол',
    headline: 'Инженер-робототехник',
    bio: 'Собираю учебных роботов и веду кружок для школьников. Помогаю понять электронику, основы программирования микроконтроллеров и собрать первый работающий прототип.',
    skills: ['robotics', 'programming', 'math'],
    interests: ['robotics', 'programming'],
    topics: [
      'Первый проект на Arduino',
      'Основы электроники для школьника',
      'Программирование микроконтроллеров',
      'Идея для робототехнического конкурса',
    ],
    password: DEMO_PASSWORD,
    isDemo: true,
  },
];

const insertProfile = db.prepare(
  `INSERT INTO profiles
    (id, email, password_hash, display_name, role, city, headline, bio, skills, interests,
     avatar_url, is_demo, is_blocked, referral_code, referred_by, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?, NULL, ?)`
);

tx(() => {
  for (const profile of profiles) {
    insertProfile.run(
      profile.id,
      profile.email,
      hashPassword(profile.password),
      profile.name,
      profile.role,
      profile.city,
      profile.headline,
      profile.bio,
      JSON.stringify(profile.skills),
      JSON.stringify(profile.interests),
      profile.isDemo ? 1 : 0,
      makeReferralCode(),
      nowIso()
    );
  }
});

const byEmail = (email: string) => profiles.find((p) => p.email === email)!;
const admin = byEmail(ADMIN_EMAIL);
const learner = byEmail('learner@ustaz.kg');
const madina = byEmail('madina@ustaz.kg');
const erjan = byEmail('erjan@ustaz.kg');
const mentors = [
  byEmail('aigerim@ustaz.kg'),
  byEmail('daniyar@ustaz.kg'),
  byEmail('aida@ustaz.kg'),
  byEmail('nursultan@ustaz.kg'),
  byEmail('timur@ustaz.kg'),
  byEmail('asel@ustaz.kg'),
  byEmail('bakyt@ustaz.kg'),
  byEmail('cholpon@ustaz.kg'),
  byEmail('azamat@ustaz.kg'),
  byEmail('kamila@ustaz.kg'),
  byEmail('ermek@ustaz.kg'),
  byEmail('adilet@ustaz.kg'),
  byEmail('ruslan@ustaz.kg'),
];
const learners = [learner, madina, erjan];

const insertSlot = db.prepare(
  `INSERT INTO mentor_slots (id, mentor_id, starts_at, ends_at, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertBooking = db.prepare(
  `INSERT INTO bookings
    (id, mentor_id, learner_id, slot_id, topic, note, status,
     learner_confirmed_at, mentor_confirmed_at, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertReview = db.prepare(
  `INSERT INTO reviews (id, booking_id, mentor_id, learner_id, rating, text, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertTransaction = db.prepare(
  `INSERT INTO point_transactions
    (id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

/** Демо-история приглашений: у Айгерим уже есть два приглашённых ученика. */
tx(() => {
  for (const invited of [learner, madina]) {
    insertTransaction.run(
      uid(),
      mentors[0].id,
      POINTS.referralBonus,
      'referral_bonus',
      `Бонус за приглашённого друга: ${invited.name}`,
      null,
      null,
      null,
      nowIso()
    );
    db.prepare(
      `INSERT INTO referrals (id, referrer_id, invited_id, points_awarded, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(uid(), mentors[0].id, invited.id, POINTS.referralBonus, nowIso());
    db.prepare(`UPDATE profiles SET referred_by = ? WHERE id = ?`).run(mentors[0].id, invited.id);
  }
});

const sessionTopics = [
  'Разбор первого React-проекта',
  'Как устроен useState и useEffect',
  'Портфолио для junior-разработчика',
  'Работа с Git и ветками',
  'Подготовка к техническому интервью',
  'Вёрстка адаптивного лендинга',
];

const reviewTexts = [
  'Очень понятно объяснил, разобрали мой код по шагам. Появилась уверенность двигаться дальше.',
  'Спокойно и по делу. Получил конкретный план на неделю.',
  'Помог увидеть ошибки в проекте и показал, как исправить. Рекомендую.',
  'Много практики, минимум теории. Именно то, что было нужно.',
  'Ответил на все вопросы и подсказал полезные материалы.',
  'Разобрали портфолио, стало понятно, что убрать и что добавить.',
];

/** История завершённых сессий — создаёт репутацию демо-наставников. */
tx(() => {
  const historyCounts = [6, 3, 4, 2, 5, 4, 3, 5, 2, 4, 3, 4, 3];
  let reviewIndex = 0;

  mentors.forEach((mentor, mentorIndex) => {
    const count = historyCounts[mentorIndex] ?? 3;
    for (let i = 0; i < count; i++) {
      const topic =
        mentor.topics?.[i % mentor.topics.length] ??
        sessionTopics[(mentorIndex + i) % sessionTopics.length];
      const slotId = uid();
      const start = pastIso(i * 3 + 2 + (mentorIndex % 5), 16, mentorIndex % 2 === 0 ? 0 : 30);
      const end = new Date(new Date(start).getTime() + 45 * 60 * 1000).toISOString();
      insertSlot.run(slotId, mentor.id, start, end, 'completed', start);

      const learnerForSession = learners[(mentorIndex + i) % learners.length];
      const bookingId = uid();
      insertBooking.run(
        bookingId,
        mentor.id,
        learnerForSession.id,
        slotId,
        topic,
        '',
        'completed',
        end,
        end,
        start,
        end
      );

      insertTransaction.run(
        uid(),
        mentor.id,
        POINTS.sessionReward,
        'session_reward',
        `Проведена подтверждённая сессия: ${topic}`,
        bookingId,
        null,
        null,
        end
      );

      // Не на каждую сессию есть отзыв — так выглядит реалистичнее.
      if ((mentorIndex + i) % 3 !== 2) {
        insertReview.run(
          uid(),
          bookingId,
          mentor.id,
          learnerForSession.id,
          4 + ((mentorIndex + i) % 2),
          reviewTexts[reviewIndex % reviewTexts.length],
          end
        );
        reviewIndex++;
      }
    }
  });
});

/** Будущие слоты и активные бронирования. */
const futureBookingIds: Record<string, string> = {};

tx(() => {
  const schedule: Array<{ day: number; hour: number; minute: number }> = [
    { day: 1, hour: 15, minute: 0 },
    { day: 2, hour: 18, minute: 30 },
    { day: 3, hour: 11, minute: 0 },
    { day: 5, hour: 16, minute: 0 },
    { day: 7, hour: 19, minute: 0 },
    { day: 9, hour: 13, minute: 30 },
  ];

  mentors.forEach((mentor, index) => {
    schedule.forEach((entry, scheduleIndex) => {
      if ((index + scheduleIndex) % 4 === 3) return;
      const slotId = uid();
      const start = iso(entry.day + (index % 2), entry.hour, entry.minute);
      const end = new Date(new Date(start).getTime() + 45 * 60 * 1000).toISOString();
      insertSlot.run(slotId, mentor.id, start, end, 'available', nowIso());

      // У Айгерим — входящая заявка (pending), у Данияра — подтверждённая сессия.
      if (index === 0 && scheduleIndex === 1) {
        const bookingId = uid();
        insertBooking.run(
          bookingId,
          mentor.id,
          learner.id,
          slotId,
          'Консультация по React: разбор компонентов',
          'Хочу разобрать, как правильно делить интерфейс на компоненты.',
          'pending',
          null,
          null,
          nowIso(),
          nowIso()
        );
        db.prepare(`UPDATE mentor_slots SET status = 'booked' WHERE id = ?`).run(slotId);
        futureBookingIds.pending = bookingId;
      }
      if (index === 1 && scheduleIndex === 0) {
        const bookingId = uid();
        insertBooking.run(
          bookingId,
          mentor.id,
          learner.id,
          slotId,
          'Разбор структуры портфолио',
          '',
          'confirmed',
          null,
          null,
          nowIso(),
          nowIso()
        );
        db.prepare(`UPDATE mentor_slots SET status = 'booked' WHERE id = ?`).run(slotId);
        futureBookingIds.confirmed = bookingId;
      }
    });
  });
});

/** Миссии */
const missions = [
  {
    id: uid(),
    title: 'Создай свой первый сайт',
    description:
      'Сверстай одностраничный сайт о себе или небольшом проекте и опубликуй его. Подойдёт любой стек: HTML/CSS или React.',
    criteria: 'Ссылка на опубликованную страницу и короткое описание того, что ты сделал.',
    difficulty: 'easy',
    reward: 80,
    days: 21,
  },
  {
    id: uid(),
    title: 'Помоги новичку разобраться с Git',
    description:
      'Проведи короткую сессию или созвон для новичка: объясни ветки, коммиты и как отправить первый pull request.',
    criteria: 'Краткое описание сессии и ссылка на репозиторий, где новичок сделал первый коммит.',
    difficulty: 'medium',
    reward: 120,
    days: 14,
  },
  {
    id: uid(),
    title: 'Подготовь мини-проект для портфолио',
    description:
      'Собери небольшой законченный проект: приложение, лендинг или дизайн-макет. Главное — довести до результата, который не стыдно показать.',
    criteria: 'Ссылка на проект и 3–5 предложений о задаче, решении и результате.',
    difficulty: 'medium',
    reward: 150,
    days: 30,
  },
  {
    id: uid(),
    title: 'Проведи первую консультацию',
    description:
      'Забронируй сессию с наставником или проведи первую консультацию сам. Поделись тем, что оказалось самым полезным.',
    criteria: 'Подтверждённая сессия на платформе и короткий вывод после неё.',
    difficulty: 'easy',
    reward: 100,
    days: 10,
  },
  {
    id: uid(),
    title: 'Изучи новую технологию за неделю',
    description:
      'Выбери технологию, которой ещё не владеешь, и за неделю сделай с ней небольшой рабочий пример. Подойдёт всё: от нового фреймворка до инструмента для дизайна.',
    criteria: 'Ссылка на результат и описание того, что было сложным.',
    difficulty: 'hard',
    reward: 200,
    days: 7,
  },
];

const insertMission = db.prepare(
  `INSERT INTO missions
    (id, title, description, criteria, difficulty, reward_points, deadline, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
);

tx(() => {
  missions.forEach((mission) => {
    insertMission.run(
      mission.id,
      mission.title,
      mission.description,
      mission.criteria,
      mission.difficulty,
      mission.reward,
      deadline(mission.days),
      nowIso()
    );
  });
});

const insertParticipant = db.prepare(
  `INSERT INTO mission_participants
    (id, mission_id, user_id, submission_text, status, review_note, reviewed_by, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

tx(() => {
  // Айбек уже выполнил миссию — есть запись в журнале и достижение.
  insertParticipant.run(
    uid(),
    missions[2].id,
    learner.id,
    'Собрал лендинг для локального образовательного клуба: адаптивная вёрстка, форма заявки и деплой на Vercel. Ссылка в профиле.',
    'approved',
    'Хорошая работа: структура и адаптивность в порядке.',
    admin.id,
    nowIso(),
    nowIso()
  );
  insertTransaction.run(
    uid(),
    learner.id,
    missions[2].reward,
    'mission_reward',
    `Миссия подтверждена: ${missions[2].title}`,
    null,
    missions[2].id,
    null,
    nowIso()
  );

  // Заявка на проверку — показываем админ-панель в действии.
  insertParticipant.run(
    uid(),
    missions[1].id,
    learner.id,
    'Провёл созвон с одногруппником: объяснил, как создать ветку, сделать коммит и открыть pull request. Ссылку на репозиторий приложил в заявке.',
    'submitted',
    '',
    null,
    nowIso(),
    nowIso()
  );

  // Ещё одна заявка от наставника.
  insertParticipant.run(
    uid(),
    missions[3].id,
    mentors[0].id,
    'Провела первую консультацию по React: разобрали компоненты и состояние. Ученик остался доволен, сессия подтверждена на платформе.',
    'submitted',
    '',
    null,
    nowIso(),
    nowIso()
  );

  // Просто участие.
  insertParticipant.run(
    uid(),
    missions[0].id,
    learner.id,
    '',
    'joined',
    '',
    null,
    nowIso(),
    nowIso()
  );
});

/** Условные бонусы для демонстрации, без реальных партнёров */
const rewards = [
  {
    partner: 'USTAZ Demo Studio',
    title: 'Разбор учебного проекта',
    description: 'Демонстрационный разбор проекта с наставником сообщества.',
    conditions: 'Пример бонуса; реальная запись и предоставление услуги не подключены.',
    cost: 150,
    qty: 25,
  },
  {
    partner: 'Demo IT Academy',
    title: 'Скидка 15% на курс',
    description: 'Скидка на любой курс по программированию демонстрационной академии.',
    conditions: 'Код действует 30 дней, не суммируется с другими акциями.',
    cost: 250,
    qty: 15,
  },
  {
    partner: 'Demo English School',
    title: 'Пробное занятие бесплатно',
    description: 'Бесплатное пробное занятие по английскому языку в демонстрационной школе.',
    conditions: 'Требуется предварительная запись по коду.',
    cost: 300,
    qty: 10,
  },
  {
    partner: 'Demo Design Lab',
    title: 'Доступ к учебным материалам',
    description: 'Набор материалов по UI/UX: чек-листы, шаблоны и разборы кейсов.',
    conditions: 'Доступ на 14 дней, код активируется на сайте партнёра.',
    cost: 400,
    qty: 20,
  },
  {
    partner: 'Demo Dev Tools',
    title: 'Промокод на учебный сервис',
    description: 'Промокод на 30 дней расширенного доступа к демонстрационному сервису.',
    conditions: 'Только для новых пользователей сервиса.',
    cost: 500,
    qty: 12,
  },
  {
    partner: 'Demo Business Hub',
    title: 'Консультация по питчу',
    description: 'Разбор питча вашего проекта с демонстрационным экспертом.',
    conditions: 'Онлайн, 30 минут, по предварительной записи.',
    cost: 800,
    qty: 5,
  },
  {
    partner: 'Demo Music Studio',
    title: 'Скидка 25% на первое занятие',
    description: 'Пробный урок вокала или гитары в демонстрационной музыкальной студии.',
    conditions: 'Для новых учеников. Код действует 14 дней.',
    cost: 200,
    qty: 8,
  },
  {
    partner: 'Demo Photo School',
    title: 'Разбор портфолио 30 минут',
    description: 'Онлайн-встреча с фотографом: композиция, свет и отбор лучших работ.',
    conditions: 'Нужно прикрепить 3–5 своих фотографий до встречи.',
    cost: 350,
    qty: 7,
  },
  {
    partner: 'Demo Speaking Club',
    title: 'Бесплатное посещение клуба',
    description: 'Одна встреча разговорного английского клуба в демонстрационном центре.',
    conditions: 'По предварительной записи, уровень от A2.',
    cost: 180,
    qty: 12,
  },
  {
    partner: 'Demo Exam Center',
    title: 'Пробный тест + разбор',
    description: 'Пробный экзаменационный тест и разбор ошибок с преподавателем.',
    conditions: 'Один тест на пользователя, запись за 3 дня.',
    cost: 300,
    qty: 10,
  },
  {
    partner: 'Demo Robotics Lab',
    title: 'Мастер-класс по робототехнике',
    description: 'Практическое занятие: соберите первого учебного робота.',
    conditions: 'Группа до 8 человек, все материалы включены.',
    cost: 450,
    qty: 6,
  },
];

const insertReward = db.prepare(
  `INSERT INTO rewards
    (id, partner_name, title, description, conditions, points_cost, available_quantity, is_demo, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'active', ?)`
);

const rewardIds: string[] = [];
tx(() => {
  rewards.forEach((reward) => {
    const id = uid();
    rewardIds.push(id);
    insertReward.run(
      id,
      reward.partner,
      reward.title,
      reward.description,
      reward.conditions,
      reward.cost,
      reward.qty,
      nowIso()
    );
  });
});

/** Демо-бонус ученику и один уже полученный купон. */
tx(() => {
  insertTransaction.run(
    uid(),
    learner.id,
    POINTS.demoLearnerBonus,
    'demo_bonus',
    'Демонстрационный бонус для презентации платформы',
    null,
    null,
    null,
    nowIso()
  );

  const redemptionId = uid();
  const coupon = makeCouponCode();
  db.prepare(
    `INSERT INTO reward_redemptions
      (id, reward_id, user_id, points_spent, coupon_code, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`
  ).run(redemptionId, rewardIds[0], learner.id, rewards[0].cost, coupon, nowIso());
  db.prepare(
    `UPDATE rewards SET available_quantity = available_quantity - 1 WHERE id = ?`
  ).run(rewardIds[0]);
  insertTransaction.run(
    uid(),
    learner.id,
    -rewards[0].cost,
    'reward_redemption',
    `Обмен баллов на бонус: ${rewards[0].title}`,
    null,
    null,
    redemptionId,
    nowIso()
  );
});

/** Достижения */
const achievements = [
  {
    code: 'first_mentor',
    title: 'Первый наставник',
    description: 'Вы присоединились к платформе в роли наставника.',
    type: 'profile_mentor',
    value: 1,
  },
  {
    code: 'first_session',
    title: 'Первая консультация',
    description: 'Первая подтверждённая сессия проведена.',
    type: 'sessions_completed',
    value: 1,
  },
  {
    code: 'five_sessions',
    title: '5 завершённых сессий',
    description: 'Пять подтверждённых сессий с учениками.',
    type: 'sessions_completed',
    value: 5,
  },
  {
    code: 'ten_hours',
    title: '10 часов помощи другим',
    description: 'Десять подтверждённых сессий — это часы реальной пользы.',
    type: 'sessions_completed',
    value: 10,
  },
  {
    code: 'first_project',
    title: 'Первый завершённый проект',
    description: 'Первая образовательная миссия подтверждена.',
    type: 'missions_approved',
    value: 1,
  },
  {
    code: 'community_active',
    title: 'Активный участник сообщества',
    description: '500 заработанных баллов за подтверждённые действия.',
    type: 'points_earned',
    value: 500,
  },
];

const insertAchievement = db.prepare(
  `INSERT INTO achievements (id, code, title, description, condition_type, condition_value)
   VALUES (?, ?, ?, ?, ?, ?)`
);

tx(() => {
  achievements.forEach((achievement) => {
    insertAchievement.run(
      uid(),
      achievement.code,
      achievement.title,
      achievement.description,
      achievement.type,
      achievement.value
    );
  });
});

/** Пересчёт достижений для всех пользователей */
profiles.forEach((profile) => checkAchievements(profile.id));

/** Демонстрационные уведомления: показывают счётчик и разные типы событий. */
tx(() => {
  notify(learner.id, {
    type: 'booking_confirmed',
    title: 'Заявка подтверждена',
    body: '«Разбор структуры портфолио». Наставник подтвердил сессию.',
    link: `/app/bookings/${futureBookingIds.confirmed}`,
  });
  notify(learner.id, {
    type: 'points_awarded',
    title: 'Баллы начислены',
    body: 'За выполненную миссию начислено 120 баллов.',
    link: '/app/points',
  });
  notify(mentors[0].id, {
    type: 'booking_created',
    title: 'Новая заявка на сессию',
    body: `${learner.name}: «Консультация по React: разбор компонентов»`,
    link: `/app/bookings/${futureBookingIds.pending}`,
  });
  notify(mentors[1].id, {
    type: 'booking_completed',
    title: 'Сессия завершена',
    body: '«Разбор структуры портфолио». Начислено 100 баллов.',
    link: '/app/points',
  });
  notify(admin.id, {
    type: 'mission_submitted',
    title: 'Новый отчёт по миссии',
    body: `${learner.name}: «${missions[1].title}».`,
    link: '/app/admin',
  });
});

// Часть уведомлений уже прочитана — так в демо видно оба состояния.
db.prepare(
  `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'points_awarded'`
).run(learner.id);
db.prepare(
  `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'booking_completed'`
).run(mentors[1].id);

const counts = {
  profiles: db.prepare('SELECT COUNT(*) AS c FROM profiles').get() as { c: number },
  slots: db.prepare('SELECT COUNT(*) AS c FROM mentor_slots').get() as { c: number },
  bookings: db.prepare('SELECT COUNT(*) AS c FROM bookings').get() as { c: number },
  missions: db.prepare('SELECT COUNT(*) AS c FROM missions').get() as { c: number },
  rewards: db.prepare('SELECT COUNT(*) AS c FROM rewards').get() as { c: number },
  notifications: db.prepare('SELECT COUNT(*) AS c FROM notifications').get() as { c: number },
};

console.log('');
console.log('USTAZ demo database seeded');
console.log('--------------------------');
console.log(`profiles: ${counts.profiles.c}`);
console.log(`slots:    ${counts.slots.c}`);
console.log(`bookings: ${counts.bookings.c}`);
console.log(`missions: ${counts.missions.c}`);
console.log(`rewards:  ${counts.rewards.c}`);
console.log(`notices:  ${counts.notifications.c}`);
console.log('');
console.log('Demo accounts:');
console.log(`  learner  learner@ustaz.kg / ${DEMO_PASSWORD}`);
console.log(`  mentor   aigerim@ustaz.kg / ${DEMO_PASSWORD}`);
console.log(`  mentor   daniyar@ustaz.kg / ${DEMO_PASSWORD}`);
console.log(`  admin    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
console.log('');
