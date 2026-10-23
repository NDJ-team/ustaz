import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { migrate } from './db';
import { errorHandler } from './http';
import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import { metaRouter } from './routes/meta';
import { mentorsRouter } from './routes/mentors';
import { slotsRouter } from './routes/slots';
import { bookingsRouter } from './routes/bookings';
import { pointsRouter } from './routes/points';
import { missionsRouter, adminMissionsRouter } from './routes/missions';
import { notificationsRouter } from './routes/notifications';
import { rewardsRouter } from './routes/rewards';
import { adminRouter } from './routes/admin';

migrate();

const app = express();
const PORT = Number(process.env.PORT || 4000);

/**
 * Белый список источников для dev-режима. В production клиент отдаётся
 * с того же origin, поэтому CORS не применяется вовсе.
 */
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const allowedOrigins = [
  ...(configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ORIGINS),
  process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, ''),
]
  .filter((origin): origin is string => Boolean(origin))
  .filter((origin, index, list) => list.indexOf(origin) === index);

const warnedOrigins = new Set<string>();

app.disable('x-powered-by');
app.use(
  cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin) {
        // Same-origin запросы и curl: браузерного источника нет.
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) {
        callback(null, true);
        return;
      }
      if (!warnedOrigins.has(normalized)) {
        warnedOrigins.add(normalized);
        console.warn(
          `[cors] источник ${normalized} не в CLIENT_ORIGIN — браузер заблокирует ответ`
        );
      }
      callback(null, false);
    },
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ustaz-api', time: new Date().toISOString() });
});

app.use('/api', authRouter);
app.use('/api', meRouter, metaRouter, mentorsRouter, slotsRouter, bookingsRouter);
app.use('/api', pointsRouter, rewardsRouter, missionsRouter, adminMissionsRouter);
app.use('/api', notificationsRouter);
app.use('/api', adminRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Маршрут API не найден' });
});

// Продакшн-режим: отдаём собранный frontend с того же сервера.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ustaz-api] http://localhost:${PORT}`);
  if (fs.existsSync(clientDist)) {
    console.log('[ustaz-api] frontend build found — serving from /');
  } else {
    console.log('[ustaz-api] frontend build not found — run client dev server on :5173');
  }
});
