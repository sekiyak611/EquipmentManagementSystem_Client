// 全画面の枠（詳細設計 common.md 11.4）。上から、ヘッダー、メッセージの帯、各画面の中身。
// ログイン中の人（AuthProvider。common.md 11.9）も、ここで全画面に渡す
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Outlet } from 'react-router';
import { AuthProvider } from '../auth/AuthProvider';
import { Header } from './Header';
import { MessageBar } from './MessageProvider';

export function AppLayout() {
  return (
    <AuthProvider>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header />
        <MessageBar />
        <Container component="main" maxWidth="lg" sx={{ py: 2 }}>
          <Outlet />
        </Container>
      </Box>
    </AuthProvider>
  );
}
