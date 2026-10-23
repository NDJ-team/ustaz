/** Сквозная проверка API: регистрация → бронирование → подтверждение → баллы → миссия → бонус. */
const BASE = process.env.API_BASE || 'http://127.0.0.1:4000/api';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, extra = ''): void {
  if (condition) {
    passed++;
    console.log(`  OK   ${label}${extra ? ' — ' + extra : ''}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`);
  }
}

interface ApiOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

async function api(path: string, { method = 'GET', token, body }: ApiOptions = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function futureIso(daysAhead: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function main(): Promise<void> {
  console.log(`\nUSTAZ API smoke test → ${BASE}\n`);

  const health = await api('/health');
  check('GET /health', health.status === 200 && health.data?.ok === true, `HTTP ${health.status}`);
  if (health.status !== 200) {
    console.log('\nAPI недоступен — запустите сервер.');
    process.exit(1);
  }

  // 1. Регистрация ученика и наставника
  const stamp = Date.now();
  const learnerEmail = `smoke_learner_${stamp}@ustaz.kg`;
  const mentorEmail = `smoke_mentor_${stamp}@ustaz.kg`;

  const learnerReg = await api('/auth/register', {
    method: 'POST',
    body: {
      email: learnerEmail,
      password: 'TestPass123!',
      display_name: 'Смоук Ученик',
      role: 'learner',
      city: 'Бишкек',
      interests: ['programming'],
    },
  });
  check('регистрация ученика', learnerReg.status === 201, `HTTP ${learnerReg.status}`);
  const learnerToken = learnerReg.data?.token;

  const mentorReg = await api('/auth/register', {
    method: 'POST',
    body: {
      email: mentorEmail,
      password: 'TestPass123!',
      display_name: 'Смоук Наставник',
      role: 'mentor',
      city: 'Бишкек',
      headline: 'Наставник по тестированию',
      skills: ['programming'],
    },
  });
  check('регистрация наставника', mentorReg.status === 201, `HTTP ${mentorReg.status}`);
  const mentorToken = mentorReg.data?.token;

  const dupe = await api('/auth/register', {
    method: 'POST',
    body: {
      email: learnerEmail,
      password: 'TestPass123!',
      display_name: 'Дубликат',
      role: 'learner',
    },
  });
  check('повторная регистрация отклонена', dupe.status === 409, `HTTP ${dupe.status}`);

  const weak = await api('/auth/register', {
    method: 'POST',
    body: { email: `x${stamp}@ustaz.kg`, password: '123', display_name: 'X', role: 'learner' },
  });
  check('короткий пароль отклонён', weak.status === 400, `HTTP ${weak.status}`);

  const badLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: learnerEmail, password: 'wrong-password' },
  });
  check('неверный пароль отклонён', badLogin.status === 401, `HTTP ${badLogin.status}`);

  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: learnerEmail, password: 'TestPass123!' },
  });
  check('вход ученика', login.status === 200 && Boolean(login.data.token));

  const noAuth = await api('/me');
  check('GET /me без токена → 401', noAuth.status === 401, `HTTP ${noAuth.status}`);

  const me = await api('/me', { token: learnerToken });
  check('GET /me с токеном', me.status === 200 && me.data.profile.role === 'learner');
  check('баланс нового ученика = 0', me.data.balance === 0, `balance=${me.data.balance}`);
  check(
    'реферальный код выдан',
    typeof me.data.referral?.code === 'string' && me.data.referral.code.length === 8,
    me.data.referral?.code
  );

  // 1.1 Реферальная механика: друг регистрируется по коду и приносит бонус.
  const invitedEmail = `smoke_invited_${stamp}@ustaz.kg`;
  const invited = await api('/auth/register', {
    method: 'POST',
    body: {
      email: invitedEmail,
      password: 'TestPass123!',
      display_name: 'Приглашённый друг',
      role: 'learner',
      ref: me.data.referral.code,
    },
  });
  check('регистрация по приглашению', invited.status === 201, `HTTP ${invited.status}`);

  const meAfterReferral = await api('/me', { token: learnerToken });
  check(
    'бонус за друга начислен',
    meAfterReferral.data.balance === 50,
    `balance=${meAfterReferral.data.balance}`
  );
  check(
    'приглашение учтено один раз',
    meAfterReferral.data.referral.invited === 1 &&
      meAfterReferral.data.referral.points_earned === 50,
    `invited=${meAfterReferral.data.referral.invited}, points=${meAfterReferral.data.referral.points_earned}`
  );

  const badRef = await api('/auth/register', {
    method: 'POST',
    body: {
      email: `smoke_badref_${stamp}@ustaz.kg`,
      password: 'TestPass123!',
      display_name: 'Плохой код',
      role: 'learner',
      ref: 'НЕТТАКОГО',
    },
  });
  check('неизвестный реферальный код отклонён', badRef.status === 400, `HTTP ${badRef.status}`);

  // 2. Каталог наставников и фильтры
  const mentors = await api('/mentors');
  check('GET /mentors возвращает наставников', mentors.status === 200 && mentors.data.length > 0,
    `${mentors.data.length} профилей`);

  const filtered = await api('/mentors?category=english');
  check(
    'фильтр по направлению',
    filtered.status === 200 && filtered.data.every((m) => m.skills.includes('english')),
    `${filtered.data.length} найдено`
  );

  const search = await api('/mentors?q=React');
  check('поиск по тексту', search.status === 200 && search.data.length > 0, `${search.data.length} найдено`);

  const mentorId = mentorReg.data.profile.id;
  const mentorProfile = await api(`/mentors/${mentorId}`);
  check('GET /mentors/:id', mentorProfile.status === 200 && mentorProfile.data.id === mentorId);

  // 3. Слоты
  const createSlot = await api('/my-slots', {
    method: 'POST',
    token: mentorToken,
    body: { starts_at: futureIso(3, 15) },
  });
  check('наставник создал слот', createSlot.status === 201, `HTTP ${createSlot.status}`);
  const slotId = createSlot.data?.id;

  const slotByLearner = await api('/my-slots', {
    method: 'POST',
    token: learnerToken,
    body: { starts_at: futureIso(4, 15) },
  });
  check('ученик не может создать слот → 403', slotByLearner.status === 403, `HTTP ${slotByLearner.status}`);

  const pastSlot = await api('/my-slots', {
    method: 'POST',
    token: mentorToken,
    body: { starts_at: new Date(Date.now() - 3600_000).toISOString() },
  });
  check('слот в прошлом отклонён', pastSlot.status === 400, `HTTP ${pastSlot.status}`);

  const slots = await api(`/mentors/${mentorId}/slots`);
  check('GET /mentors/:id/slots', slots.status === 200 && slots.data.length > 0);

  // 4. Бронирование
  const selfBooking = await api('/bookings', {
    method: 'POST',
    token: mentorToken,
    body: { mentor_id: mentorId, slot_id: slotId, topic: 'Сам к себе' },
  });
  check('наставник не может бронировать сам → 403', selfBooking.status === 403, `HTTP ${selfBooking.status}`);

  const booking = await api('/bookings', {
    method: 'POST',
    token: learnerToken,
    body: { mentor_id: mentorId, slot_id: slotId, topic: 'Смоук-тест консультация' },
  });
  check('ученик создал бронирование', booking.status === 201, `HTTP ${booking.status}`);
  const bookingId = booking.data?.id;
  check('статус бронирования pending', booking.data?.status === 'pending', booking.data?.status);

  const doubleBook = await api('/bookings', {
    method: 'POST',
    token: learnerToken,
    body: { mentor_id: mentorId, slot_id: slotId, topic: 'Повторная попытка' },
  });
  check('повторное бронирование слота отклонено', doubleBook.status === 409, `HTTP ${doubleBook.status}`);

  const learnerConfirms = await api(`/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    token: learnerToken,
  });
  check('ученик не может подтвердить заявку → 403', learnerConfirms.status === 403,
    `HTTP ${learnerConfirms.status}`);

  const completeBeforeConfirm = await api(`/bookings/${bookingId}/complete`, {
    method: 'POST',
    token: mentorToken,
  });
  check('нельзя завершить pending-сессию', completeBeforeConfirm.status === 409,
    `HTTP ${completeBeforeConfirm.status}`);

  const confirm = await api(`/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    token: mentorToken,
  });
  check('наставник подтвердил заявку', confirm.status === 200 && confirm.data.status === 'confirmed');

  // 5. Завершение сессии и начисление баллов
  const mentorCompletes = await api(`/bookings/${bookingId}/complete`, {
    method: 'POST',
    token: mentorToken,
  });
  check('наставник отметил завершение', mentorCompletes.status === 200);
  check('баллы ещё не начислены', mentorCompletes.data.awarded === false);

  const balanceBefore = await api('/points/balance', { token: mentorToken });
  check('до второго подтверждения баланс 0', balanceBefore.data.balance === 0,
    `balance=${balanceBefore.data.balance}`);

  const learnerCompletes = await api(`/bookings/${bookingId}/complete`, {
    method: 'POST',
    token: learnerToken,
  });
  check('ученик подтвердил завершение', learnerCompletes.status === 200);
  check('наставнику начислено 100 баллов', learnerCompletes.data.awarded === true && learnerCompletes.data.points === 100,
    `points=${learnerCompletes.data.points}`);
  check('статус бронирования completed', learnerCompletes.data.booking.status === 'completed');

  const balanceAfter = await api('/points/balance', { token: mentorToken });
  check('баланс наставника = 100', balanceAfter.data.balance === 100, `balance=${balanceAfter.data.balance}`);

  const repeatComplete = await api(`/bookings/${bookingId}/complete`, {
    method: 'POST',
    token: learnerToken,
  });
  check('повторное завершение не начисляет баллы', repeatComplete.data.awarded === false);

  const balanceAfterRepeat = await api('/points/balance', { token: mentorToken });
  check('баланс не изменился после повтора', balanceAfterRepeat.data.balance === 100,
    `balance=${balanceAfterRepeat.data.balance}`);

  const transactions = await api('/points/transactions', { token: mentorToken });
  const sessionTx = transactions.data.filter((t) => t.transaction_type === 'session_reward');
  check('в журнале ровно одна запись о сессии', sessionTx.length === 1, `${sessionTx.length} записей`);

  // 6. Отзыв
  const review = await api(`/bookings/${bookingId}/review`, {
    method: 'POST',
    token: learnerToken,
    body: { rating: 5, text: 'Отличная консультация, всё по делу.' },
  });
  check('ученик оставил отзыв', review.status === 201, `HTTP ${review.status}`);

  const reviewAgain = await api(`/bookings/${bookingId}/review`, {
    method: 'POST',
    token: learnerToken,
    body: { rating: 4, text: 'Повторный отзыв' },
  });
  check('повторный отзыв отклонён', reviewAgain.status === 409, `HTTP ${reviewAgain.status}`);

  const mentorReviews = await api(`/mentors/${mentorId}`);
  check('отзыв попал в профиль наставника', mentorReviews.data.reviews.length === 1);

  // 7. Миссии
  const missions = await api('/missions', { token: learnerToken });
  check('GET /missions', missions.status === 200 && missions.data.length >= 5,
    `${missions.data.length} миссий`);
  // Берём самую «дорогую» миссию, чтобы награды хватило на минимальный бонус партнёра.
  const mission = [...missions.data].sort((a, b) => b.reward_points - a.reward_points)[0];
  const missionId = mission.id;

  const join = await api(`/missions/${missionId}/join`, { method: 'POST', token: learnerToken });
  check('ученик присоединился к миссии', join.status === 201, `HTTP ${join.status}`);

  const joinAgain = await api(`/missions/${missionId}/join`, { method: 'POST', token: learnerToken });
  check('повторное присоединение отклонено', joinAgain.status === 409, `HTTP ${joinAgain.status}`);

  const submitShort = await api(`/missions/${missionId}/submit`, {
    method: 'POST',
    token: learnerToken,
    body: { submission_text: 'мало' },
  });
  check('слишком короткий отчёт отклонён', submitShort.status === 400, `HTTP ${submitShort.status}`);

  const submit = await api(`/missions/${missionId}/submit`, {
    method: 'POST',
    token: learnerToken,
    body: { submission_text: 'Сделал проект и опубликовал его, ссылка в описании работы.' },
  });
  check('отчёт отправлен на проверку', submit.status === 200);

  const learnerAdminAccess = await api('/admin/missions/pending', { token: learnerToken });
  check('ученик не имеет доступа к админке → 403', learnerAdminAccess.status === 403,
    `HTTP ${learnerAdminAccess.status}`);

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@ustaz.kg',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin1234!',
    },
  });
  check('вход администратора', adminLogin.status === 200 && adminLogin.data.profile.role === 'admin',
    `HTTP ${adminLogin.status}`);
  const adminToken = adminLogin.data?.token;

  const pending = await api('/admin/missions/pending', { token: adminToken });
  const myApplication = pending.data.find((p) => p.submission_text.includes('опубликовал его'));
  check('заявка видна администратору', Boolean(myApplication));

  const balanceBeforeMission = await api('/points/balance', { token: learnerToken });
  const reviewApprove = await api(`/admin/missions/participants/${myApplication.id}/review`, {
    method: 'POST',
    token: adminToken,
    body: { action: 'approve', note: 'Принято' },
  });
  check('администратор подтвердил миссию', reviewApprove.status === 200 && reviewApprove.data.awarded === true);

  const reviewApproveAgain = await api(`/admin/missions/participants/${myApplication.id}/review`, {
    method: 'POST',
    token: adminToken,
    body: { action: 'approve' },
  });
  check('повторная проверка миссии отклонена', reviewApproveAgain.status === 409,
    `HTTP ${reviewApproveAgain.status}`);

  const balanceAfterMission = await api('/points/balance', { token: learnerToken });
  check(
    'баланс вырос на награду миссии',
    balanceAfterMission.data.balance === balanceBeforeMission.data.balance + mission.reward_points,
    `${balanceBeforeMission.data.balance} → ${balanceAfterMission.data.balance}`
  );

  // 8. Бонусы
  const rewards = await api('/rewards', { token: learnerToken });
  check('GET /rewards', rewards.status === 200 && rewards.data.rewards.length > 0,
    `${rewards.data.rewards.length} предложений`);

  const affordable = rewards.data.rewards.find((r) => r.points_cost <= rewards.data.balance);
  const tooExpensive = rewards.data.rewards.find((r) => r.points_cost > rewards.data.balance);
  check('есть доступное предложение', Boolean(affordable));

  if (tooExpensive) {
    const poorRedeem = await api(`/rewards/${tooExpensive.id}/redeem`, {
      method: 'POST',
      token: learnerToken,
      body: { confirm: true },
    });
    check('обмен без достаточного баланса отклонён', poorRedeem.status === 400, `HTTP ${poorRedeem.status}`);
  }

  const noConfirm = await api(`/rewards/${affordable.id}/redeem`, {
    method: 'POST',
    token: learnerToken,
    body: {},
  });
  check('обмен без подтверждения отклонён', noConfirm.status === 400, `HTTP ${noConfirm.status}`);

  const qtyBefore = affordable.available_quantity;
  const redeem = await api(`/rewards/${affordable.id}/redeem`, {
    method: 'POST',
    token: learnerToken,
    body: { confirm: true },
  });
  check('обмен баллов выполнен', redeem.status === 201, `HTTP ${redeem.status}`);
  check('выдан уникальный купон', /^UST-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(redeem.data.coupon_code ?? ''),
    redeem.data?.coupon_code);

  const balanceAfterRedeem = await api('/points/balance', { token: learnerToken });
  check(
    'баллы списаны',
    balanceAfterRedeem.data.balance === balanceAfterMission.data.balance - affordable.points_cost,
    `${balanceAfterMission.data.balance} → ${balanceAfterRedeem.data.balance}`
  );

  const rewardsAfter = await api('/rewards', { token: learnerToken });
  const sameReward = rewardsAfter.data.rewards.find((r) => r.id === affordable.id);
  check('количество предложения уменьшилось', sameReward.available_quantity === qtyBefore - 1,
    `${qtyBefore} → ${sameReward.available_quantity}`);

  const myCoupons = await api('/rewards/my', { token: learnerToken });
  check('купон виден в «Мои бонусы»', myCoupons.data.some((c) => c.coupon_code === redeem.data.coupon_code));

  // 9. Достижения
  const meAfter = await api('/me', { token: learnerToken });
  check('ученик получил достижение за миссию',
    meAfter.data.achievements.some((a) => a.code === 'first_project'),
    meAfter.data.achievements.map((a) => a.code).join(', '));
  check('уровень рассчитан', Boolean(meAfter.data.level.name), meAfter.data.level.name);

  // 10. Изоляция данных
  const otherLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: process.env.LEARNER_EMAIL || 'learner@ustaz.kg', password: process.env.LEARNER_PASSWORD || 'Demo1234!' },
  });
  const strangerToken = otherLogin.data?.token;
  const strangerComplete = await api(`/bookings/${bookingId}/complete`, {
    method: 'POST',
    token: strangerToken,
  });
  check('посторонний не может менять чужую сессию', strangerComplete.status === 400 || strangerComplete.status === 403,
    `HTTP ${strangerComplete.status}`);

  // 11. Отмена
  const slot2 = await api('/my-slots', {
    method: 'POST',
    token: mentorToken,
    body: { starts_at: futureIso(6, 12) },
  });
  const booking2 = await api('/bookings', {
    method: 'POST',
    token: learnerToken,
    body: { mentor_id: mentorId, slot_id: slot2.data.id, topic: 'Сессия для проверки отмены' },
  });
  const cancel = await api(`/bookings/${booking2.data.id}/cancel`, {
    method: 'POST',
    token: learnerToken,
  });
  check('отмена бронирования', cancel.status === 200 && cancel.data.status === 'cancelled');

  const slotsAfterCancel = await api(`/mentors/${mentorId}/slots`);
  check('слот вернулся в доступные', slotsAfterCancel.data.some((s) => s.id === slot2.data.id));

  const dispute = await api(`/bookings/${bookingId}/dispute`, {
    method: 'POST',
    token: learnerToken,
  });
  check('спор нельзя открыть по завершённой сессии', dispute.status === 409, `HTTP ${dispute.status}`);

  console.log(`\nИтог: ${passed} успешно, ${failed} провалено\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nСкрипт упал с ошибкой:', error);
  process.exit(1);
});
