// S-03 パスワード設定（画面設計 6章・8章、詳細設計 auth/S-03_パスワード設定.md）。スマートフォンの画面を先に作る
import { useEffect, useState, type FormEvent } from 'react';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../../../common/api/client';
import { useApi } from '../../../common/api/useApi';
import { useMessage } from '../../../common/components/MessageProvider';
import { SubmitButton } from '../../../common/components/SubmitButton';
import { setPasswordWithToken, verifyPasswordToken } from '../api';
import { PasswordField } from '../components/PasswordField';
import { checkPasswordRules, validateNewPassword, validatePasswordConfirm } from '../validation';

/** リンクが使えないときの文（画面設計 6章。サーバーの message と同じ） */
const UNUSABLE_MESSAGE = 'このリンクは使えません。有効期限が切れたか、すでに使われています。';

/** パスワードを設定できたあと、S-01 に出す文（画面設計 6章） */
const DONE_MESSAGE = 'パスワードを設定しました。新しいパスワードでログインしてください。';

type FieldErrors = { password?: string; passwordConfirm?: string };

/**
 * この画面を開いている間だけ、リンクのアドレス（合言葉を含む）が、移った先に伝わらないようにする
 * （機能一覧 6章の5：Referrer-Policy を no-referrer にする。詳細設計 S-03 の10章 No.6）。
 */
function useNoReferrer(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}

/** 決まりの1行。満たしていれば先頭を「✓」、そうでなければ「・」にする（画面設計 6章） */
function Rule({ satisfied, children }: { satisfied: boolean; children: string }) {
  return (
    <Typography variant="body2" color={satisfied ? 'success.main' : 'text.secondary'}>
      {satisfied ? '✓' : '・'}
      {children}
    </Typography>
  );
}

/** リンクが使えないときの表示（画面設計 6章）：入力欄の代わりに、文と、S-02 へのリンク */
function UnusableLink() {
  return (
    <Container maxWidth="xs" disableGutters>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography>{UNUSABLE_MESSAGE}</Typography>
        <Link component={RouterLink} to="/password-reset">
          パスワード再設定の依頼へ
        </Link>
      </Stack>
    </Container>
  );
}

export function PasswordSetPage() {
  useNoReferrer();
  const message = useMessage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  // 開いたときの確かめ（A-05）。token がなければ、API を呼ばずに「使えない」とする
  const verified = useApi(
    () => (token === '' ? Promise.reject(new ApiError(400, UNUSABLE_MESSAGE, null)) : verifyPasswordToken({ token })),
    [token],
  );
  // 「設定する」を押したときに、リンクが使えなくなっていたとき
  const [usedUp, setUsedUp] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  // 確かめられなかった（つながらない・500 など）：赤の帯に文を出す（詳細設計 S-03 の10章 No.5）。
  // 使えない（400）は、帯でなく、画面の中に出す
  const verifyError = verified.error;
  const verifyFailedByServer = verifyError !== null && !(verifyError.status === 400);
  useEffect(() => {
    if (verifyFailedByServer && verifyError) {
      message.error(verifyError.message);
    }
  }, [verifyFailedByServer, verifyError, message]);

  if (verified.loading) {
    // 確かめている間は、何も出さない
    return null;
  }
  if (verifyError !== null) {
    // 使えない（400）：入力欄の代わりに表示する。ほかの失敗：帯だけ（入力欄は出さない）
    return verifyError.status === 400 ? <UnusableLink /> : null;
  }
  if (usedUp) {
    return <UnusableLink />;
  }
  const info = verified.data;
  if (!info) {
    return null;
  }

  const rules = checkPasswordRules(password);

  const handleSet = async () => {
    message.clear();
    const found: FieldErrors = {
      password: validateNewPassword(password),
      passwordConfirm: validatePasswordConfirm(password, passwordConfirm),
    };
    setErrors(found);
    if (found.password || found.passwordConfirm) {
      return;
    }
    try {
      await setPasswordWithToken({ token, password, passwordConfirm });
      // S-01 に移る。履歴を置き換えて、合言葉を含むアドレスを、戻る操作で開けないようにする
      message.success(DONE_MESSAGE);
      navigate('/login', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors.length > 0) {
        setErrors(e.fieldMessages());
      } else if (e instanceof ApiError && e.status === 400) {
        // 入力の誤りでない 400：リンクが使えなくなった（ほかで先に使われた、期限が切れた、など）
        setUsedUp(true);
      } else if (e instanceof ApiError) {
        message.error(e.message);
      }
    }
  };

  return (
    <Container maxWidth="xs" disableGutters>
      {/* Enter でも設定できるよう form にする。送信は SubmitButton が行う */}
      <form noValidate onSubmit={(e: FormEvent) => e.preventDefault()}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="h5" component="h1">
            {info.purpose === 'REGISTER' ? 'パスワードの設定' : 'パスワードの再設定'}
          </Typography>
          <Typography data-testid="password-set-email">{info.email}</Typography>
          <PasswordField
            label="新しいパスワード"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password}
            fullWidth
          />
          <PasswordField
            label="新しいパスワード（確認）"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            error={Boolean(errors.passwordConfirm)}
            helperText={errors.passwordConfirm}
            fullWidth
          />
          <Stack>
            <Rule satisfied={rules.length}>8文字以上、64文字以内</Rule>
            <Rule satisfied={rules.characters}>使える文字：半角の英字・数字・記号・スペース</Rule>
          </Stack>
          <SubmitButton type="submit" size="large" fullWidth onClick={handleSet}>
            設定する
          </SubmitButton>
        </Stack>
      </form>
    </Container>
  );
}
