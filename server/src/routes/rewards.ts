import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../auth';
import { db, tx } from '../db';
import { asyncHandler, HttpError, parseBody } from '../http';
import { getBalance } from '../serialize';
import { makeCouponCode, nowIso, uid } from '../utils';

export const rewardsRouter = Router();

interface RewardRow {
  id: string;
  partner_name: string;
  title: string;
  description: string;
  conditions: string;
  points_cost: number;
  available_quantity: number;
  is_demo: number;
  status: string;
  created_at: string;
}

function mapReward(row: RewardRow) {
  return {
    id: row.id,
    partner_name: row.partner_name,
    title: row.title,
    description: row.description,
    conditions: row.conditions,
    points_cost: row.points_cost,
    available_quantity: row.available_quantity,
    is_demo: Boolean(row.is_demo),
    status: row.status,
  };
}

rewardsRouter.get(
  '/rewards',
  authRequired,
  asyncHandler((req, res) => {
    const rows = db
      .prepare(
        `SELECT * FROM rewards WHERE status = 'active'
         ORDER BY points_cost ASC`
      )
      .all() as unknown as RewardRow[];
    res.json({ rewards: rows.map(mapReward), balance: getBalance(req.user!.id) });
  })
);

const redeemSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Подтвердите обмен баллов' }),
  }),
});

rewardsRouter.post(
  '/rewards/:id/redeem',
  authRequired,
  asyncHandler((req, res) => {
    const me = req.user!;
    parseBody(redeemSchema, req.body);

    let redemptionId = '';
    let couponCode = '';
    let rewardTitle = '';
    let cost = 0;

    tx(() => {
      const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id) as
        | RewardRow
        | undefined;
      if (!reward || reward.status !== 'active') throw new HttpError(404, 'Предложение недоступно');
      if (reward.available_quantity <= 0) throw new HttpError(409, 'Предложение закончилось');

      const balance = getBalance(me.id);
      if (balance < reward.points_cost) {
        throw new HttpError(400, 'Недостаточно баллов для обмена');
      }

      redemptionId = uid();
      couponCode = makeCouponCode();
      rewardTitle = reward.title;
      cost = reward.points_cost;

      db.prepare(
        `INSERT INTO reward_redemptions
          (id, reward_id, user_id, points_spent, coupon_code, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`
      ).run(redemptionId, reward.id, me.id, cost, couponCode, nowIso());

      const updated = db
        .prepare(
          `UPDATE rewards SET available_quantity = available_quantity - 1
           WHERE id = ? AND available_quantity > 0`
        )
        .run(reward.id);
      if (updated.changes === 0) throw new HttpError(409, 'Предложение закончилось');

      // Отрицательная транзакция — единственный способ списать баллы.
      db.prepare(
        `INSERT INTO point_transactions
          (id, user_id, amount, transaction_type, reason, booking_id, mission_id, redemption_id, created_at)
         VALUES (?, ?, ?, 'reward_redemption', ?, NULL, NULL, ?, ?)`
      ).run(
        uid(),
        me.id,
        -cost,
        `Обмен баллов на бонус: ${rewardTitle}`,
        redemptionId,
        nowIso()
      );
    });

    res.status(201).json({
      id: redemptionId,
      coupon_code: couponCode,
      points_spent: cost,
      reward_title: rewardTitle,
      balance: getBalance(me.id),
    });
  })
);

rewardsRouter.get(
  '/rewards/my',
  authRequired,
  asyncHandler((req, res) => {
    const rows = db
      .prepare(
        `SELECT rr.*, r.title, r.partner_name, r.description, r.conditions, r.is_demo
         FROM reward_redemptions rr
         JOIN rewards r ON r.id = rr.reward_id
         WHERE rr.user_id = ?
         ORDER BY rr.created_at DESC`
      )
      .all(req.user!.id)
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id,
          coupon_code: r.coupon_code,
          points_spent: r.points_spent,
          status: r.status,
          created_at: r.created_at,
          reward: {
            id: r.reward_id,
            title: r.title,
            partner_name: r.partner_name,
            description: r.description,
            conditions: r.conditions,
            is_demo: Boolean(r.is_demo),
          },
        };
      });
    res.json(rows);
  })
);
