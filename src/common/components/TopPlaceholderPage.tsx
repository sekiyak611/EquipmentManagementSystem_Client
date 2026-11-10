// 仮のトップ画面（詳細設計 common.md 11.8 の2）。
// ログインが要る（routes.tsx の RequireLogin の中）。S-05・S-07 ができたら、ログイン後の最初の画面（API設計 4.2 の homePage）に置き換える。
import Typography from '@mui/material/Typography';

export function TopPlaceholderPage() {
  return (
    <Typography variant="body1" data-testid="top-placeholder">
      備品管理システム（画面は準備中です）
    </Typography>
  );
}
