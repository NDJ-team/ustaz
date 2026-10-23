import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = fn(req, res, next);
      if (result instanceof Promise) result.catch(next);
    } catch (error) {
      next(error);
    }
  };
}

export function parseBody<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, issue?.message ?? 'Некорректные данные запроса');
  }
  return result.data;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: error.issues[0]?.message ?? 'Некорректные данные' });
    return;
  }

  const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
  const who = req.user ? `${req.user.id} (${req.user.email})` : 'аноним';

  if (message.includes('UNIQUE constraint failed')) {
    // Ожидаемая гонка: повторное действие уже было выполнено. Не шумим стеком.
    console.warn(
      `[api] 409 conflict ${req.method} ${req.originalUrl} user=${who}: ${message}`
    );
    res.status(409).json({ error: 'Операция уже была выполнена' });
    return;
  }

  // Для 500 логируем всё, что нужно для разбора: когда, что, кто и стек.
  const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(
    `[api] ${new Date().toISOString()} 500 ${req.method} ${req.originalUrl} user=${who}\n${stack}`
  );
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
