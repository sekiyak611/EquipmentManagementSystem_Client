// 画面の入口（詳細設計 common.md 11.2）。テーマ、メッセージ、画面の切り替えを組み立てる。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { MessageProvider } from './common/components/MessageProvider';
import { theme } from './common/theme/theme';
import { routes } from './routes';

const router = createBrowserRouter(routes);

// ログインしていない（401）ときにログイン画面へ移す処理は、common/auth の AuthProvider が入れる（common.md 11.9）

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
