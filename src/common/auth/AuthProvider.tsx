// ログイン中の人を持つ部品（common.md 11.9、API設計 2.2・4.2）。
// 画面を開いたときに A-03 を1回呼ぶ。各画面からは const { me } = useAuth(); で使う
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { setUnauthorizedHandler } from '../api/client';
import { getMe } from './authApi';
import type { MeResponse } from './types';

type AuthApi = {
  /** ログイン中の人。ログインしていなければ null */
  me: MeResponse | null;
  /** 最初の A-03 を待っている間は true */
  loading: boolean;
  /** ログインしたときに入れる */
  setMe: (me: MeResponse) => void;
  /** ログアウトしたときに消す */
  clear: () => void;
  /**
   * 自分でログアウトした直後なら true。RequireLogin が、ログイン画面に redirect を付けずに移すのに使う
   * （ログアウトした画面に、次にログインした人を戻さないため）
   */
  loggedOut: boolean;
};

const AuthContext = createContext<AuthApi | null>(null);

/** ログイン画面のアドレス。redirect に、ログインしたあとに戻る画面を付ける（画面設計 1.4） */
export function loginPath(pathname: string, search: string): string {
  return `/login?redirect=${encodeURIComponent(pathname + search)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    getMe()
      .then((value) => {
        if (active) {
          setMeState(value);
        }
      })
      .catch(() => {
        // ログインしていない（401）、つながらない、など。ログインしていない扱いにする
        if (active) {
          setMeState(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // ほかの API が 401（ログインが切れた）を返したら、ログイン中の人を消してログイン画面に移す（画面設計 1.4）
  const { pathname, search } = location;
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMeState(null);
      if (pathname !== '/login') {
        void navigate(loginPath(pathname, search));
      }
    });
  }, [navigate, pathname, search]);

  const setMe = useCallback((value: MeResponse) => {
    setLoggedOut(false);
    setMeState(value);
  }, []);
  const clear = useCallback(() => {
    setLoggedOut(true);
    setMeState(null);
  }, []);
  const api = useMemo<AuthApi>(
    () => ({ me, loading, setMe, clear, loggedOut }),
    [me, loading, setMe, clear, loggedOut],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

/** ログイン中の人を使う */
export function useAuth(): AuthApi {
  const api = useContext(AuthContext);
  if (!api) {
    throw new Error('useAuth は AuthProvider の中で使う');
  }
  return api;
}
