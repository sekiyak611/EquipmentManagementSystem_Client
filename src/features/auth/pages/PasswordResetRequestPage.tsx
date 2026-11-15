// S-02 パスワード再設定の依頼（画面設計 5章、詳細設計 auth/S-02_パスワード再設定の依頼.md）。スマートフォンの画面を先に作る
import { useState, type FormEvent } from 'react';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { ApiError } from '../../../common/api/client';
import { useMessage } from '../../../common/components/MessageProvider';
import { SubmitButton } from '../../../common/components/SubmitButton';
import { requestPasswordReset } from '../api';
import { validateEmail } from '../validation';

/**
 * 送信したあとの文（画面設計 5章）。登録の有無・5分以内・DMを送れたかにかかわらず、いつも同じ文を出す
 * （他人に登録の有無を知らせないため）
 */
const SENT_MESSAGE =
  '登録されているメールアドレスであれば、SlackのDMでパスワード設定用のリンクを送りました。届かない場合は、総務に連絡してください。';

export function PasswordResetRequestPage() {
  const message = useMessage();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const handleSend = async () => {
    message.clear();
    const found = validateEmail(email);
    setEmailError(found);
    if (found) {
      return;
    }
    try {
      await requestPasswordReset({ email });
      // 送ったあとも、この画面にとどまり、入力欄の値は残す（詳細設計 S-02 の10章 No.3）
      message.success(SENT_MESSAGE);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors.length > 0) {
        setEmailError(e.fieldMessages().email);
      } else if (e instanceof ApiError) {
        // 403・つながらない・500 など：サーバー（または common/api）の文を赤の帯に出す
        message.error(e.message);
      }
    }
  };

  return (
    <Container maxWidth="xs" disableGutters>
      {/* Enter でも送信できるよう form にする。送信は SubmitButton が行う */}
      <form noValidate onSubmit={(e: FormEvent) => e.preventDefault()}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="h5" component="h1">
            パスワードの再設定
          </Typography>
          <Typography>登録しているメールアドレスを入力してください。</Typography>
          <Typography>パスワードを設定するためのリンクを、SlackのDMでお送りします。</Typography>
          <TextField
            label="メールアドレス"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(emailError)}
            helperText={emailError}
            fullWidth
          />
          <SubmitButton type="submit" size="large" fullWidth onClick={handleSend}>
            送信
          </SubmitButton>
          <Link component={RouterLink} to="/login">
            ログイン画面に戻る
          </Link>
        </Stack>
      </form>
    </Container>
  );
}
