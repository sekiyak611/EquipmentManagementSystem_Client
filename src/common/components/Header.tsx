// 共通ヘッダー（画面設計 1.1、詳細設計 common.md 11.4）。
// メニューとログイン中の人の氏名は、ログイン（ZPOP-25）で付ける。
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';

export function Header() {
  return (
    <AppBar position="sticky" component="header">
      <Toolbar>
        {/* システム名。押すとトップに戻る */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold' }}
        >
          備品管理
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
