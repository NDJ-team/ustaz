import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

/** Пропускает только авторизованных; иначе — на вход. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!me) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

/** Только для роли admin. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace />;
  if (me.profile.role !== 'admin') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** Гостевые страницы (вход/регистрация) недоступны уже вошедшим. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (me) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
