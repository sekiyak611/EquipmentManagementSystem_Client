// 画面の入口（詳細設計 common.md 11.2）。テーマ、メッセージ、画面の切り替えを組み立てる。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { setUnauthorizedHandler } from './common/api/client';
import { MessageProvider } from './common/components/MessageProvider';
import { theme } from './common/theme/theme';
import { routes } from './routes';

const router = createBrowserRouter(routes);

// ログインしていない（401）ときは、ログイン画面に移す。
// ログインしたあとに、最初に開こうとした画面に戻れるよう、今のアドレスを付ける（画面設計 1.4）
setUnauthorizedHandler(() => {
  const { pathname, search } = router.state.location;
  if (pathname === '/login') {
    return;
  }
  void router.navigate(`/login?redirect=${encodeURIComponent(pathname + search)}`);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MessageProvider>
        <RouterProvider router={router} />
      </MessageProvider>
    </ThemeProvider>
  </StrictMode>,
);
