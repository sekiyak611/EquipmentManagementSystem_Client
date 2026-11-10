// S-01 ログイン（画面設計 2章、詳細設計 auth/S-01_ログイン.md）。スマートフォンの画面を先に作る
import { useState, type FormEvent } from 'react';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Navigate, Link as RouterLink, useSearchParams } from 'react-router';
import { ApiError } from '../../../common/api/client';
import { useAuth } from '../../../common/auth/AuthProvider';
import { useMessage } from '../../../common/components/MessageProvider';
import { SubmitButton } from '../../../common/components/SubmitButton';
import { login } from '../api';
import { PasswordField } from '../components/PasswordField';

/** メールアドレスの文字数の上限（画面設計 2章） */
const EMAIL_MAX_LENGTH = 254;

/** メールアドレスの形：@ の前後に文字があり、@ の後ろに「.」があり、空白がない */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

/** 入力チェック（画面設計 2章。メッセージは画面設計の文のまま） */
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (email.trim() === '') {
    errors.email = 'メールアドレスを入力してください';
  } else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = 'メールアドレスの形が正しくありません';
  }
  if (password === '') {
    errors.password = 'パスワードを入力してください';
  }
  return errors;
}

/**
 * ログインしたあとに移る画面。ほかのサイトへ移されないよう、redirect を今のサイトのアドレスとして読み、
 * サイト（https://ホスト名 の部分）が今のサイトと同じで、「/」で始まるときだけ使う。
 * 「//example.com」「/\example.com」のように、ブラウザがほかのサイトと読む書き方は使わない。なければ最初の画面（/）。
 */
function safeRedirect(redirect: string | null): string {
  if (!redirect || !redirect.startsWith('/')) {
    return '/';
  }
  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) {
      return '/';
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}

export function LoginPage() {
  const { me, loading, setMe } = useAuth();
  const message = useMessage();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  if (loading) {
    // ログイン中の人を確かめている間は、何も出さない
    return null;
  }
  if (me) {
    // ログインできたとき（setMe のあと）は、最初に開こうとした画面（redirect）、なければ最初の画面に移る（画面設計 2章）。
    // ログインしている人がこの画面を開いたときも同じ（画面設計 2章「その他」）
    return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />;
  }

  const handleLogin = async () => {
    message.clear();
    const found = validate(email, password);
    setErrors(found);
    if (found.email || found.password) {
      return;
    }
    try {
      // ログイン中の人を入れると、この画面が描き直され、上の Navigate で移る
      setMe(await login({ email, password, rememberMe }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors.length > 0) {
        setErrors(e.fieldMessages());
      } else if (e instanceof ApiError) {
        // 401：「メールアドレスまたはパスワードが違います」、つながらない：「問題が発生しました…」など、
        // サーバー（または common/api）の文を赤の帯に出す
        message.error(e.message);
        if (e.status === 401) {
          // ログインできなかったときは、パスワードの欄を空にする（2026-11-10 に決めた。詳細設計 S-01 の 8章 No.4）。
          // メールアドレスは残す。つながらないときは、打ち直しにならないよう残す
          setPassword('');
        }
      }
    }
  };

  return (
    <Container maxWidth="xs" disableGutters>
      {/* Enter でもログインできるよう form にする。送信は SubmitButton が行う */}
      <form noValidate onSubmit={(e: FormEvent) => e.preventDefault()}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="h5" component="h1">
            ログイン
          </Typography>
          <TextField
            label="メールアドレス"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
            fullWidth
          />
          <PasswordField
            label="パスワード"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password}
            fullWidth
          />
          <FormControlLabel
            control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
            label="ログインしたままにする（60日間）"
          />
          <SubmitButton type="submit" size="large" fullWidth onClick={handleLogin}>
            ログイン
          </SubmitButton>
          <Link component={RouterLink} to="/password-reset">
            パスワードを忘れた方はこちら
          </Link>
          <Typography variant="body2" color="text.secondary">
            ※5回続けて間違えると、パスワードの再設定が必要になります
          </Typography>
        </Stack>
      </form>
    </Container>
  );
}
