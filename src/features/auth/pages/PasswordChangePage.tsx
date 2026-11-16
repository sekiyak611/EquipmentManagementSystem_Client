// S-04 パスワード変更（画面設計 7章・8章、詳細設計 auth/S-04_パスワード変更.md）。スマートフォンの画面を先に作る
import { useState, type FormEvent } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '../../../common/api/client';
import { useMessage } from '../../../common/components/MessageProvider';
import { SubmitButton } from '../../../common/components/SubmitButton';
import { changePassword } from '../api';
import { PasswordField } from '../components/PasswordField';
import {
  checkPasswordRules,
  validateCurrentPassword,
  validateNewPassword,
  validatePasswordConfirm,
  validatePasswordDiffers,
} from '../validation';

/** パスワードを変更できたときの文（画面設計 7章） */
const DONE_MESSAGE = 'パスワードを変更しました';

type FieldErrors = { currentPassword?: string; password?: string; passwordConfirm?: string };

/** 決まりの1行。満たしていれば先頭を「✓」、そうでなければ「・」にする（S-03 と同じ） */
function Rule({ satisfied, children }: { satisfied: boolean; children: string }) {
  return (
    <Typography variant="body2" color={satisfied ? 'success.main' : 'text.secondary'}>
      {satisfied ? '✓' : '・'}
      {children}
    </Typography>
  );
}

export function PasswordChangePage() {
  const message = useMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const rules = checkPasswordRules(password);

  /** 入力チェック（画面設計 7章・8章。メッセージは画面設計の文のまま） */
  const validate = (): FieldErrors => ({
    currentPassword: validateCurrentPassword(currentPassword),
    // 新しいパスワードの1つの欄には、1つだけ：空 → 使えない文字 → 短い → 長い → 現在と同じ
    password: validateNewPassword(password) ?? validatePasswordDiffers(currentPassword, password),
    passwordConfirm: validatePasswordConfirm(password, passwordConfirm),
  });

  const handleChange = async () => {
    message.clear();
    const found = validate();
    setErrors(found);
    if (found.currentPassword || found.password || found.passwordConfirm) {
      return;
    }
    try {
      await changePassword({ currentPassword, password, passwordConfirm });
      message.success(DONE_MESSAGE);
      // この画面を開く前の画面に戻る。履歴がない（この画面を直接開いた）ときは、最初の画面（詳細設計 S-04 の10章 No.4）
      if (location.key === 'default') {
        await navigate('/', { replace: true });
      } else {
        await navigate(-1);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors.length > 0) {
        // 現在のパスワードが違う・現在と同じ・使えないパスワードなど。入力欄の値は残す（10章の No.6）
        setErrors(e.fieldMessages());
      } else if (e instanceof ApiError) {
        // 403・つながらない・500 など：サーバー（または common/api）の文を赤の帯に出す。401 は common/api がログイン画面へ移す
        message.error(e.message);
      }
    }
  };

  return (
    <Container maxWidth="xs" disableGutters>
      {/* Enter でも変更できるよう form にする。送信は SubmitButton が行う */}
      <form noValidate onSubmit={(e: FormEvent) => e.preventDefault()}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="h5" component="h1">
            パスワード変更
          </Typography>
          <PasswordField
            label="現在のパスワード"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword}
            fullWidth
          />
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
          <SubmitButton type="submit" size="large" fullWidth onClick={handleChange}>
            変更する
          </SubmitButton>
        </Stack>
      </form>
    </Container>
  );
}
