import type { NextFunction, Request, Response } from 'express';

/**
 * Простой in-memory rate limiter для одного процесса.
 *
 * Для MVP этого достаточно: демо и smoke-тесты идут против одного инстанса.
 * При горизонтальном масштабировании счётчики нужно вынести в Redis.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  /** Начало сообщения в ответе 429. */
  message: string;
  /**
   * Если true, считаются только неуспешные ответы, а успешный сбрасывает
   * счётчик. Так удобно для входа: верный пароль не расходует лимит.
   */
  failuresOnly?: boolean;
  /** Какие статусы считать неуспехом (по умолчанию любой 4xx). */
  isFailure?: (status: number) => boolean;
}

const buckets = new Map<string, Bucket>();

/** Страховка от роста памяти при большом числе уникальных ключей. */
const MAX_BUCKETS = 10_000;

function pruneExpired(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    key,
    message,
    failuresOnly = false,
    isFailure = (status: number) => status >= 400 && status !== 429,
  } = options;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    pruneExpired(now);

    const bucketKey = key(req);
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }

    if (bucket.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: `${message} Повторите через ${Math.ceil(retryAfter / 60)} мин.`,
      });
      return;
    }

    if (!failuresOnly) {
      bucket.count += 1;
      next();
      return;
    }

    // Сам запрос пропускаем, но после ответа фиксируем результат.
    res.on('finish', () => {
      const current = buckets.get(bucketKey);
      if (!current || current.resetAt <= Date.now()) return;
      if (isFailure(res.statusCode)) {
        current.count += 1;
      } else if (res.statusCode < 400) {
        buckets.delete(bucketKey);
      }
    });

    next();
  };
}

/** Ключ по IP (Express учитывает настройку trust proxy). */
export function ipKey(prefix: string) {
  return (req: Request): string => `${prefix}:${req.ip ?? 'unknown'}`;
}

/** Ключ по IP + email из тела запроса. */
export function ipEmailKey(prefix: string) {
  return (req: Request): string => {
    const raw = req.body && typeof req.body === 'object' ? (req.body as { email?: unknown }).email : '';
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    return `${prefix}:${req.ip ?? 'unknown'}|${email}`;
  };
}
