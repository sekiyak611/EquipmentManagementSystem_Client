// 確認のダイアログ（画面設計 1.3、詳細設計 common.md 11.6）。
// 「キャンセル」か、窓の外を押すと閉じる。実行ボタンは、処理が終わるまで押せない。
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { SubmitButton } from './SubmitButton';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  /** 実行ボタンの名前（例：「削除する」） */
  confirmLabel: string;
  /** 実行ボタンを押したときの処理 */
  onConfirm: () => Promise<unknown> | void;
  /** 閉じるとき（キャンセル・窓の外） */
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>キャンセル</Button>
        <SubmitButton onClick={onConfirm}>{confirmLabel}</SubmitButton>
      </DialogActions>
    </Dialog>
  );
}
