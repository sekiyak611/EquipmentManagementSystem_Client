// ログイン後の最初の画面（/）。ログインが要る（routes.tsx の RequireLogin の中）。
// 詳細設計 common.md 11.8 の2、equipment/mine/S-05_自分の備品.md の1章・6章・10章 No.2・13・14。
// homePage（API設計 4.2）が MY_EQUIPMENT で、自分の備品（S-05）を開ける人は、/my-equipment に移す。
// homePage が EQUIPMENT_LIST の人は、S-07 ができるまで、今までどおりの仮の画面のまま。
import Typography from '@mui/material/Typography';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/permissions';

export function TopPlaceholderPage() {
  const { me } = useAuth();
  // MY_EQUIPMENT でも、LOAN_SELF を持たない人は移さない（S-05 が権限がない画面を出し、「最初の画面へ」で / に戻って、
  // 同じ所を行き来するのを防ぐため。S-05 の10章 No.13）
  if (me?.homePage === 'MY_EQUIPMENT' && hasPermission(me, 'LOAN_SELF')) {
    return <Navigate to="/my-equipment" replace />;
  }
  return (
    <Typography variant="body1" data-testid="top-placeholder">
      備品管理システム（画面は準備中です）
    </Typography>
  );
}
