// 種別の追加・変更のダイアログ（画面設計 16章、詳細設計 category/S-13_種別管理.md 3〜5章・9章）。
// 開くたびに作り直す（呼ぶ側が key を変える）ので、入力欄の最初の値は開いたときの種別から決まる。
import { useState, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ApiError } from '../../../common/api/client';
import { SubmitButton } from '../../../common/components/SubmitButton';
import { createCategory, updateCategory } from '../api';
import type { CategoryResponse } from '../types';

/** 名前の文字数の上限（画面設計 16章） */
const NAME_MAX_LENGTH = 20;

/** 頭文字の形：英字1文字（大文字に直したあとで確かめる。画面設計 16章） */
const INITIAL_PATTERN = /^[A-Z]$/;

type FieldErrors = { name?: string; initial?: string };

/** 送る値の直し方（サーバーと同じ。K-02 の2.3）：名前は前後の空白を取り除く。頭文字は前後の空白を取り除いて大文字にし、空なら null */
function normalize(name: string, initial: string): { name: string; initial: string | null } {
  const trimmedInitial = initial.trim();
  return { name: name.trim(), initial: trimmedInitial === '' ? null : trimmedInitial.toUpperCase() };
}

/** 入力チェック（画面設計 16章。メッセージは画面設計の文のまま） */
function validate(name: string, initial: string | null): FieldErrors {
  const errors: FieldErrors = {};
  if (name === '') {
    errors.name = '名前を入力してください';
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = '名前は20文字以内で入力してください';
  }
  if (initial !== null && !INITIAL_PATTERN.test(initial)) {
    errors.initial = '頭文字は英字1文字で入力してください';
  }
  return errors;
}

type CategoryFormDialogProps = {
  open: boolean;
  /** 変える種別。null なら追加 */
  target: CategoryResponse | null;
  onClose: () => void;
  /** 追加・保存できたとき。サーバーが返した種別を渡す */
  onSaved: (saved: CategoryResponse) => void;
  /** 入力欄の下に出せない失敗（赤の帯に出すもの）のとき */
  onFailed: (error: ApiError) => void;
};

export function CategoryFormDialog({ open, target, onClose, onSaved, onFailed }: CategoryFormDialogProps) {
  const isEdit = target !== null;
  const [name, setName] = useState(target?.name ?? '');
  const [initial, setInitial] = useState(target?.initial ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  // 処理中は、窓の外を押しても閉じない（詳細設計 S-13 の10章 No.4）
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const values = normalize(name, initial);
    const found = validate(values.name, values.initial);
    setErrors(found);
    if (found.name || found.initial) {
      return;
    }
    setSubmitting(true);
    try {
      const saved = target
        ? await updateCategory(target.id, { ...values, version: target.version })
        : await createCategory(values);
      onSaved(saved);
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError(0, String(e), null);
      const fieldMessages = error.fieldMessages();
      if (error.status === 400 && (fieldMessages.name || fieldMessages.initial)) {
        // 入力の誤り・名前や頭文字の重なり：ダイアログを開いたまま、入力欄の下に出す
        setErrors({ name: fieldMessages.name, initial: fieldMessages.initial });
      } else {
        onFailed(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      aria-labelledby="category-form-dialog-title"
      fullWidth
      maxWidth="xs"
    >
      {/* Enter でも送れるよう form にする。送信は SubmitButton が行う */}
      <form noValidate onSubmit={(e: FormEvent) => e.preventDefault()}>
        <DialogTitle id="category-form-dialog-title">{isEdit ? '種別の変更' : '種別の追加'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="名前"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              error={Boolean(errors.name)}
              helperText={errors.name}
              fullWidth
              autoFocus
            />
            <TextField
              label="頭文字"
              value={initial}
              onChange={(e) => {
                setInitial(e.target.value);
                setErrors((prev) => ({ ...prev, initial: undefined }));
              }}
              error={Boolean(errors.initial)}
              helperText={errors.initial}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <SubmitButton type="submit" onClick={handleSubmit}>
            {isEdit ? '保存する' : '追加する'}
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
