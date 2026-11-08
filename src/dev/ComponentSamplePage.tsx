// 共通部品の見本の画面（/_dev/components）。開発とテストのときだけ開ける（詳細設計 common.md 11.7）。
// npm run build で組み立てた画面には入らない（routes.tsx で import.meta.env.DEV のときだけ登録している）。
// 画面設計にはない画面なので、ここの文は確かめるための仮の文。
import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ApiError, apiGet, apiPost } from '../common/api/client';
import { ConfirmDialog } from '../common/components/ConfirmDialog';
import { useMessage } from '../common/components/MessageProvider';
import { SubmitButton } from '../common/components/SubmitButton';
import { formatDate, formatDateWithWeekday, orDash } from '../common/format/format';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function ComponentSamplePage() {
  const message = useMessage();
  const [result, setResult] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const showStatus = (e: unknown) => setResult(e instanceof ApiError ? `エラー ${e.status}` : String(e));

  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h6">共通部品の見本（開発とテストだけ）</Typography>

      <Typography variant="subtitle1">メッセージの帯</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => message.success('借りました（A001）')}>
          完了の帯
        </Button>
        <Button variant="outlined" onClick={() => message.error('この備品はすでに貸し出されています')}>
          失敗の帯
        </Button>
      </Stack>

      <Typography variant="subtitle1">APIの呼び出し</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          onClick={() =>
            apiGet<{ state: string }>('/api/health').then((d) => setResult(`state=${d.state}`), showStatus)
          }
        >
          GETを送る
        </Button>
        <Button
          variant="outlined"
          // A-01 はまだないので 404 になる。合言葉が通らなければ 403 になる
          onClick={() => apiPost('/api/auth/login', {}).then(() => setResult('成功'), showStatus)}
        >
          POSTを送る
        </Button>
        <Button
          variant="outlined"
          // ログインが必要なAPI。401 になり、ログイン画面に移る
          onClick={() => apiGet('/api/me/loans').then(() => setResult('成功'), showStatus)}
        >
          ログインが必要なAPI
        </Button>
      </Stack>
      <Typography data-testid="api-result">{result}</Typography>

      <Typography variant="subtitle1">確認ダイアログ・押せないボタン</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => setDialogOpen(true)}>
          ダイアログを開く
        </Button>
        <SubmitButton
          onClick={async () => {
            await wait(1000);
            setRunCount((c) => c + 1);
          }}
        >
          1秒かかる処理
        </SubmitButton>
      </Stack>
      <Typography data-testid="run-count">{`動いた回数：${runCount}`}</Typography>
      <ConfirmDialog
        open={dialogOpen}
        title="確認"
        message="実行しますか？"
        confirmLabel="実行する"
        onCancel={() => setDialogOpen(false)}
        onConfirm={async () => {
          await wait(1000);
          setRunCount((c) => c + 1);
          setDialogOpen(false);
          message.success('実行しました');
        }}
      />

      <Typography variant="subtitle1">表示の形</Typography>
      <Typography data-testid="format-date">{formatDate('2026-11-02')}</Typography>
      <Typography data-testid="format-weekday">{formatDateWithWeekday('2026-11-02')}</Typography>
      <Typography data-testid="format-datetime">{formatDate('2026-11-25T09:00:00+09:00')}</Typography>
      <Typography data-testid="format-empty">{orDash(null)}</Typography>
    </Stack>
  );
}
