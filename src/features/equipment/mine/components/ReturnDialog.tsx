// 「返す」のダイアログ（画面設計 3章、詳細設計 equipment/mine/S-05_自分の備品.md 3.3・4章・9.2）。
// 開くたびに作り直す（呼ぶ側が key を変える）ので、メモは開いたときは空。
import { useState, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ApiError } from '../../../../common/api/client';
import { SubmitButton } from '../../../../common/components/SubmitButton';
import { returnLoan } from '../api';
import type { MyLoanItemResponse, MyLoansResponse } from '../types';
import { todayInJapanText } from './reminderText';

/** メモの文字数の上限（画面設計 3章） */
const MEMO_MAX_LENGTH = 200;

type ReturnDialogProps = {
  open: boolean;
  /** 返す備品 */
  target: MyLoanItemResponse | null;
  onClose: () => void;
  /** 返せたとき。サーバーが返した最新の一覧を渡す */
  onReturned: (list: MyLoansResponse, target: MyLoanItemResponse) => void;
  /** 入力欄の下に出せない失敗（赤の帯に出すもの）のとき */
  onFailed: (error: ApiError) => void;
  /** 送っている間は true にする（一覧の操作ボタンを押せなくするため。5章） */
  onSubmittingChange: (submitting: boolean) => void;
};

export function ReturnDialog({ open, target, onClose, onReturned, onFailed, onSubmittingChange }: ReturnDialogProps) {
  const [memo, setMemo] = useState('');
  const [memoError, setMemoError] = useState<string | null>(null);
  // 処理中は、窓の外を押しても、キャンセルを押しても閉じない（10章 No.4）
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!target) {
      return;
    }
    // 送る前に、前後の空白を取り除き、空なら null にする（サーバーも同じ。B-03 の2.3）
    const trimmed = memo.trim();
    if (trimmed.length > MEMO_MAX_LENGTH) {
      setMemoError('メモは200文字以内で入力してください');
      return;
    }
    setMemoError(null);
    setSubmitting(true);
    onSubmittingChange(true);
    try {
      const list = await returnLoan(target.loanId, { memo: trimmed === '' ? null : trimmed });
      onReturned(list, target);
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError(0, String(e), null);
      const fieldMessage = error.fieldMessages().memo;
      if (error.status === 400 && fieldMessage) {
        // サーバーの入力の誤り：ダイアログを開いたまま、メモ欄の下に出す
        setMemoError(fieldMessage);
      } else {
        onFailed(error);
      }
    } finally {
      setSubmitting(false);
      onSubmittingChange(false);
    }
  };

  const makerModel = [target?.maker, target?.model].filter((v) => v).join(' ');

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      aria-labelledby="return-dialog-title"
      fullWidth
      maxWidth="xs"
    >
      <form noValidate onSubmit={(e: FormEvent) => e.preventDefault()}>
        <DialogTitle id="return-dialog-title">返す</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography sx={{ overflowWrap: 'anywhere' }}>
              返す備品　{target?.managementNo}　{target?.categoryName}
              {makerModel && `　${makerModel}`}
            </Typography>
            <Typography>返却日　{todayInJapanText()}</Typography>
            <TextField
              label="メモ"
              value={memo}
              onChange={(e) => {
                setMemo(e.target.value);
                setMemoError(null);
              }}
              error={Boolean(memoError)}
              helperText={memoError}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting} sx={{ minHeight: 44 }}>
            キャンセル
          </Button>
          <SubmitButton type="submit" onClick={handleSubmit} sx={{ minHeight: 44 }}>
            返す
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
