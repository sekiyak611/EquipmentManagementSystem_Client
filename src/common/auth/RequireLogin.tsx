// ログインが要る画面のまとまり（routes.tsx。common.md 11.9、画面設計 1.4）。
// ログインしていなければ、ログイン画面（/login?redirect=今のアドレス）に移す
import { Navigate, Outlet, useLocation } from 'react-router';
import { loginPath, useAuth } from './AuthProvider';

export function RequireLogin() {
  const { me, loading, loggedOut } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) {
    // ログイン中の人を確かめている間は、何も出さない
    return null;
  }
  if (!me) {
    // 自分でログアウトしたときは、redirect を付けない（画面設計 1.1：ログアウトしたらログイン画面へ）
    return <Navigate to={loggedOut ? '/login' : loginPath(pathname, search)} replace />;
  }
  return <Outlet />;
}
