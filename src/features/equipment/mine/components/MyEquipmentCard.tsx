// S-05 備品1件の表示（画面設計 3章、詳細設計 equipment/mine/S-05_自分の備品.md 3.1）
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatDate } from '../../../../common/format/format';
import type { MyLoanItemResponse } from '../types';

type MyEquipmentCardProps = {
  item: MyLoanItemResponse;
  /** 「確認した」「確認済み」を出すか（権限項目 CONFIRM_SELF を持つか。10章 No.5） */
  canConfirm: boolean;
  /** 確認・返却を送っている間は、ボタンを押せなくする（5章） */
  busy: boolean;
  onConfirm: (item: MyLoanItemResponse) => void;
  onReturn: (item: MyLoanItemResponse) => void;
};

export function MyEquipmentCard({ item, canConfirm, busy, onConfirm, onReturn }: MyEquipmentCardProps) {
  // メーカーとモデルが両方なければ、行を出さない（10章 No.8）
  const makerModel = [item.maker, item.model].filter((v) => v).join(' ');
  return (
    <Card variant="outlined" data-testid="my-equipment-card">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}>
              {item.managementNo}　{item.categoryName}
            </Typography>
            <Chip
              size="small"
              label={item.confirmedThisMonth ? '確認済み' : '未確認'}
              color={item.confirmedThisMonth ? 'success' : 'warning'}
            />
          </Stack>
          {makerModel && <Typography sx={{ overflowWrap: 'anywhere' }}>{makerModel}</Typography>}
          <Typography>
            貸出日 {formatDate(item.lentOn)}
            <Typography component="span" sx={{ color: item.overdue ? 'error.main' : undefined }}>
              {' '}
              返却予定日 {formatDate(item.dueOn)}
            </Typography>
          </Typography>
          <Typography>最終確認日 {formatDate(item.lastConfirmedOn)}</Typography>
          <Stack direction="row" spacing={1}>
            {canConfirm &&
              (item.confirmedThisMonth ? (
                <Button variant="outlined" disabled sx={{ minHeight: 44 }}>
                  確認済み
                </Button>
              ) : (
                <Button variant="contained" disabled={busy} onClick={() => onConfirm(item)} sx={{ minHeight: 44 }}>
                  確認した
                </Button>
              ))}
            <Button variant="outlined" disabled={busy} onClick={() => onReturn(item)} sx={{ minHeight: 44 }}>
              返す
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
