import { useEffect, useState } from 'react';
import { api } from './api';
import type { Meta } from './types';

let cached: Meta | null = null;
let pending: Promise<Meta> | null = null;

function load(): Promise<Meta> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = api.get<Meta>('/meta', false).then((data) => {
      cached = data;
      pending = null;
      return data;
    });
  }
  return pending;
}

/** Метаданные платформы (категории, города, уровни) — грузятся один раз. */
export function useMeta() {
  const [meta, setMeta] = useState<Meta | null>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;
    let active = true;
    load()
      .then((data) => {
        if (active) setMeta(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      });
    return () => {
      active = false;
    };
  }, []);

  return { meta, error };
}
