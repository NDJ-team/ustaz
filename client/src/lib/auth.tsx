import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, getToken, setToken, UNAUTHORIZED_EVENT } from './api';
import type { Me } from './types';

interface AuthResponse extends Me {
  token: string;
}

interface AuthContextValue {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
  role: 'learner' | 'mentor';
  city?: string;
  headline?: string;
  bio?: string;
  interests?: string[];
  skills?: string[];
  ref?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<Me>('/me');
      setMe(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setToken(null);
      }
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Любой авторизованный запрос, получивший 401, завершает сессию.
  // Guards увидят me === null и переведут на /login.
  useEffect(() => {
    function handleUnauthorized() {
      setToken(null);
      setMe(null);
      setLoading(false);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password }, false);
    setToken(data.token);
    setMe(data);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await api.post<AuthResponse>('/auth/register', payload, false);
    setToken(data.token);
    setMe(data);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ me, loading, login, register, logout, refresh }),
    [me, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return context;
}
