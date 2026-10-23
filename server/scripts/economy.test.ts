import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, POINTS, levelFor } from '../src/config';

test('уровни начинаются с нуля и пороги строго возрастают', () => {
  assert.equal(LEVELS[0].minPoints, 0);
  for (let index = 1; index < LEVELS.length; index += 1) {
    assert.ok(
      LEVELS[index].minPoints > LEVELS[index - 1].minPoints,
      `порог ${LEVELS[index].name} должен быть выше ${LEVELS[index - 1].name}`
    );
  }
});

test('levelFor: границы каждого уровня', () => {
  const cases: Array<[number, string]> = [
    [0, 'Новичок'],
    [1, 'Новичок'],
    [199, 'Новичок'],
    [200, 'Помощник'],
    [599, 'Помощник'],
    [600, 'Наставник'],
    [1499, 'Наставник'],
    [1500, 'Эксперт сообщества'],
    [100_000, 'Эксперт сообщества'],
  ];

  for (const [earned, expected] of cases) {
    assert.equal(levelFor(earned).name, expected, `для ${earned} баллов`);
  }
});

test('levelFor: прогресс и следующий уровень', () => {
  assert.equal(levelFor(0).progress, 0);
  assert.equal(levelFor(0).nextName, 'Помощник');
  assert.equal(levelFor(0).nextAt, 200);

  assert.equal(levelFor(200).progress, 0);
  assert.equal(levelFor(400).progress, 0.5, 'середина между Помощником и Наставником');
  assert.equal(levelFor(600).progress, 0, 'новый уровень начинается с нуля');

  assert.equal(levelFor(1050).progress, 0.5, 'середина между Наставником и Экспертом');
  assert.equal(levelFor(1500).progress, 1);
  assert.equal(levelFor(1500).nextName, null);
  assert.equal(levelFor(1500).nextAt, null);
  assert.equal(levelFor(5000).progress, 1);
});

test('levelFor: отрицательные значения не дают отрицательный прогресс', () => {
  for (const earned of [-1000, -1, 0]) {
    const level = levelFor(earned);
    assert.equal(level.name, 'Новичок');
    assert.ok(level.progress >= 0 && level.progress <= 1);
  }
});

test('экономика: все награды — целые положительные баллы', () => {
  for (const [name, value] of Object.entries(POINTS)) {
    assert.ok(Number.isInteger(value), `${name} должен быть целым`);
    assert.ok(value > 0, `${name} должен быть положительным`);
  }
});

test('демо-бонус ученика соответствует уровню «Помощник»', () => {
  assert.equal(levelFor(POINTS.demoLearnerBonus).name, 'Помощник');
});
