// S-05 上部の案内（画面設計 3章「上部の案内」4通りのうち、備品があるときの3通り。
// 詳細設計 equipment/mine/S-05_自分の備品.md 6章。備品がないときの「借りている備品はありません。」は、画面が出す）
import Alert from '@mui/material/Alert';
import type { MyLoansResponse } from '../types';
import { reminderText } from './reminderText';

export function MyEquipmentNotice({ list }: { list: MyLoansResponse }) {
  if (list.unconfirmedCount === 0) {
    return (
      <Alert severity="success" data-testid="my-equipment-notice">
        今月の確認はすべて済んでいます。
      </Alert>
    );
  }
  if (list.reminderPassed) {
    return (
      <Alert severity="warning" data-testid="my-equipment-notice">
        今月まだ確認していない備品が {list.unconfirmedCount}件 あります。確認してください。
      </Alert>
    );
  }
  return (
    <Alert severity="warning" data-testid="my-equipment-notice">
      今月まだ確認していない備品が {list.unconfirmedCount}件 あります。
      <br />
      {reminderText(list.reminderAt)} までに確認してください。
    </Alert>
  );
}
