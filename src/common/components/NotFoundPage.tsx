// 見つからないときの仮の画面（詳細設計 common.md 11.8 の2）。
// エラー画面 S-19（ZPOP-30）で置き換える。文は画面設計 22章のもの。
import Typography from '@mui/material/Typography';

export function NotFoundPage() {
  return (
    <Typography variant="body1" data-testid="not-found">
      ページが見つかりません。
    </Typography>
  );
}
