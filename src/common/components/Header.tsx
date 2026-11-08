// 共通ヘッダー（画面設計 1.1、詳細設計 common.md 11.4・11.9）。
// ログインしているときは、右に氏名を出し、押すと「ログアウト」を出す。
// 「パスワード変更」は S-04（ZPOP-106）、メニューは各画面を作るときに足す。
import { useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { logout } from '../auth/authApi';
import { useAuth } from '../auth/AuthProvider';
import { useMessage } from './MessageProvider';

export function Header() {
  const { me, clear } = useAuth();
  const message = useMessage();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  // 画面の描き直しより先に2回目が押されても、ログアウトを2回動かさないための印（SubmitButton と同じ）
  const loggingOutRef = useRef(false);

  /** ログイン中の人を消して、ログイン画面へ移る（自分でログアウトしたので redirect は付けない） */
  const goToLogin = async () => {
    // ログイン中の人を消すと、ログインが要る画面では RequireLogin がログイン画面に移す。
    // ログインの要らない画面（見つからない画面など）にいたときのために、ここでも移る
    clear();
    message.clear();
    await navigate('/login', { replace: true });
  };

  const handleLogout = async () => {
    // 押したら、処理が終わるまで押せなくする（画面設計 1.3）
    if (loggingOutRef.current) {
      return;
    }
    loggingOutRef.current = true;
    setLoggingOut(true);
    setAnchor(null);
    try {
      await logout();
      await goToLogin();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // ログインがすでに切れていた。ログアウトできたのと同じ扱いにする
        await goToLogin();
      } else if (e instanceof ApiError) {
        message.error(e.message);
      }
    } finally {
      loggingOutRef.current = false;
      setLoggingOut(false);
    }
  };

  return (
    <AppBar position="sticky" component="header">
      <Toolbar>
        {/* システム名。押すとトップ（ログイン後の最初の画面）に戻る */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold' }}
        >
          備品管理
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {/* ログイン前の画面（S-01〜S-03）には、システム名だけを出す（画面設計 1.1） */}
        {me && (
          <>
            <Button
              color="inherit"
              aria-haspopup="menu"
              aria-expanded={anchor ? 'true' : undefined}
              onClick={(e) => setAnchor(e.currentTarget)}
              data-testid="header-user"
            >
              {me.name}
            </Button>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => void handleLogout()} disabled={loggingOut}>
                ログアウト
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
