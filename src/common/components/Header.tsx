// 共通ヘッダー（画面設計 1.1、詳細設計 common.md 11.4・11.9）。
// ログインしているときは、その人の権限で開ける画面のメニュー（menuItems.ts）と、右に氏名を出す。氏名を押すと「ログアウト」を出す。
// メニューは、スマートフォンでは「≡」ボタンで開き、PCでは横に並べる。
// 「パスワード変更」は S-04（ZPOP-106）で、氏名を押したときの中に足す。
import { useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { logout } from '../auth/authApi';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/permissions';
import { MENU_ITEMS } from './menuItems';
import { useMessage } from './MessageProvider';

export function Header() {
  const { me, clear } = useAuth();
  const message = useMessage();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // スマートフォンの「≡」で開くメニューの位置
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  // その人の権限で開ける画面だけ（画面設計 1.1）
  const menuItems = me
    ? MENU_ITEMS.filter((item) => item.permission === null || hasPermission(me, item.permission))
    : [];
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
        {/* スマートフォンのメニュー。「≡」を押すと開く（画面設計 1.1）。開ける画面がなければ出さない */}
        {menuItems.length > 0 && (
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mr: 1 }}>
            <IconButton
              color="inherit"
              aria-label="メニュー"
              aria-haspopup="menu"
              aria-expanded={menuAnchor ? 'true' : undefined}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ minWidth: 44, minHeight: 44, fontSize: 24 }}
              data-testid="header-menu-button"
            >
              ≡
            </IconButton>
            <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
              {menuItems.map((item) => (
                <MenuItem key={item.path} component={Link} to={item.path} onClick={() => setMenuAnchor(null)}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
        {/* システム名。押すとトップ（ログイン後の最初の画面）に戻る */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold', whiteSpace: 'nowrap' }}
        >
          備品管理
        </Typography>
        {/* PCのメニュー。横に並べ、入りきらなければ次の行に折り返す（画面設計 1.1） */}
        <Box
          component="nav"
          aria-label="メニュー"
          sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', flexGrow: 1, ml: 2 }}
          data-testid="header-menu"
        >
          {menuItems.map((item) => (
            <Button key={item.path} color="inherit" component={Link} to={item.path}>
              {item.label}
            </Button>
          ))}
        </Box>
        {/* スマートフォンでは、氏名を右に寄せるための空き */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, flexGrow: 1 }} />
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
