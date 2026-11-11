// S-19 エラー（画面設計 22章、詳細設計 common.md 11.10）。スマートフォンの画面を先に作る（画面一覧 7章）。
// アドレスは変えずに、開こうとした画面の中身の代わりに出す（2026-11-11 に人が決めた）。
// 画面を開いて読み込む API が失敗したときと、ないアドレス、画面の不具合のときに出す。ボタンを押した操作の失敗は、各画面が赤の帯で出す。
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import type { ApiError } from '../api/client';

/** どの場合のエラーか */
export type ErrorKind = 'forbidden' | 'notFound' | 'systemError';

/** 場合ごとの文（画面設計 22章の文のまま） */
const MESSAGES: Record<ErrorKind, string> = {
  forbidden: 'このページを見る権限がありません。',
  notFound: 'ページが見つかりません。',
  systemError: '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。',
};

export function ErrorPage({ kind }: { kind: ErrorKind }) {
  return (
    <Stack spacing={3} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
      <Typography variant="body1" data-testid="error-page" data-kind={kind}>
        {MESSAGES[kind]}
      </Typography>
      {/* どの場合も「最初の画面へ」を出す（画面設計 22章）。最初の画面は / （ログイン後の最初の画面） */}
      <Button variant="contained" size="large" component={Link} to="/">
        最初の画面へ
      </Button>
    </Stack>
  );
}

/** 画面を開いて読み込む API が失敗したときの場合分け。403 は権限がない、404 は見つからない、ほかはシステムの不具合 */
export function errorKindOf(error: ApiError): ErrorKind {
  if (error.status === 403) {
    return 'forbidden';
  }
  if (error.status === 404) {
    return 'notFound';
  }
  return 'systemError';
}

/**
 * 画面を開いて読み込む API が失敗したときに出す S-19。
 * 401（ログインが切れた）は common/api がログイン画面に移すので、何も出さない（画面設計 22章・1.4）
 */
export function ApiErrorPage({ error }: { error: ApiError }) {
  if (error.status === 401) {
    return null;
  }
  return <ErrorPage kind={errorKindOf(error)} />;
}

/**
 * 画面を描いている途中で不具合が起きたとき（React Router の errorElement）に出す S-19。
 * 詳しい中身は画面に出さない（画面設計 22章）。React Router が、ブラウザの記録（console）に残す
 */
export function RouteErrorPage() {
  return <ErrorPage kind="systemError" />;
}
