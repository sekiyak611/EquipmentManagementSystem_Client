// 全画面の枠（詳細設計 common.md 11.4）。上から、ヘッダー、メッセージの帯、各画面の中身。
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { MessageBar } from './MessageProvider';

export function AppLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <MessageBar />
      <Container component="main" maxWidth="lg" sx={{ py: 2 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
