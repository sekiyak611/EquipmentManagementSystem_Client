// S-13 種別管理（画面設計 16章、詳細設計 category/S-13_種別管理.md）。PCで使う画面（画面一覧 7章）
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import { ApiError } from '../../../common/api/client';
import { useApi } from '../../../common/api/useApi';
import { useAuth } from '../../../common/auth/AuthProvider';
import { hasPermission } from '../../../common/auth/permissions';
import { ConfirmDialog } from '../../../common/components/ConfirmDialog';
import { useMessage } from '../../../common/components/MessageProvider';
import { deleteCategory, getCategories } from '../api';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import { CategoryTable } from '../components/CategoryTable';
import type { CategoryResponse } from '../types';

/** この画面を開ける権限項目（データ設計 5.3「種別を管理する」） */
const CATEGORY_MANAGE = 'CATEGORY_MANAGE';

export function CategoryListPage() {
  const { me } = useAuth();
  if (!hasPermission(me, CATEGORY_MANAGE)) {
    // 権限がない人には、エラー画面（S-19）の文を出す。S-19（ZPOP-121）ができたら置き換える（詳細設計 S-13 の10章 No.2）。
    // 一覧（K-01）は読まない
    return (
      <Stack spacing={2} sx={{ mt: 2, alignItems: 'flex-start' }}>
        <Typography data-testid="no-permission">このページを見る権限がありません。</Typography>
        <Button variant="contained" component={Link} to="/">
          最初の画面へ
        </Button>
      </Stack>
    );
  }
  return <CategoryList />;
}

/** フォームのダイアログの状態。key は開くたびに変え、入力欄を作り直す */
type FormState = { open: boolean; target: CategoryResponse | null; key: number };

function CategoryList() {
  const message = useMessage();
  const { data: categories, loading, error, reload } = useApi(() => getCategories(), []);
  const [form, setForm] = useState<FormState>({ open: false, target: null, key: 0 });
  // 削除の確認ダイアログ。閉じる途中も名前を出しておくため、target は閉じても残す
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; target: CategoryResponse | null }>({
    open: false,
    target: null,
  });
  const closeDelete = () => setDeleteDialog((prev) => ({ ...prev, open: false }));

  const openForm = (target: CategoryResponse | null) => {
    message.clear();
    setForm((prev) => ({ open: true, target, key: prev.key + 1 }));
  };
  const closeForm = () => setForm((prev) => ({ ...prev, open: false }));

  /**
   * 赤の帯に出す失敗（決まりに合わない・権限がない・見つからない・ほかの人が先に保存した・つながらない、など）。
   * 帯がダイアログの後ろに隠れないようダイアログを閉じ、最新の一覧を読み直す（詳細設計 S-13 の9.2・10章 No.3）
   */
  const handleFailed = (e: ApiError) => {
    closeForm();
    closeDelete();
    if (e.status !== 401) {
      // 401 は common/api がログイン画面に移す
      message.error(e.message);
      reload();
    }
  };

  const handleSaved = (saved: CategoryResponse) => {
    closeForm();
    message.success(form.target ? `保存しました（${saved.name}）` : `追加しました（${saved.name}）`);
    reload();
  };

  const handleDelete = async () => {
    const target = deleteDialog.target;
    if (!target) {
      return;
    }
    try {
      await deleteCategory(target.id);
      closeDelete();
      message.success(`削除しました（${target.name}）`);
      reload();
    } catch (e) {
      handleFailed(e instanceof ApiError ? e : new ApiError(0, String(e), null));
    }
  };

  // 読み込みに失敗したら、赤の帯に出す（画面設計 1.2）。表は出さない。401 は common/api がログイン画面に移す
  useEffect(() => {
    if (error && error.status !== 401) {
      message.error(error.message);
    }
    // message は変わらない部品（useMemo）なので、実際には error が変わったときだけ動く
  }, [error, message]);

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" component="h1">
          種別管理
        </Typography>
        <Button variant="contained" onClick={() => openForm(null)}>
          追加
        </Button>
      </Stack>
      {loading && !categories ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress data-testid="category-loading" />
        </Box>
      ) : (
        categories && (
          <CategoryTable
            categories={categories}
            onEdit={(category) => openForm(category)}
            onDelete={(category) => {
              message.clear();
              setDeleteDialog({ open: true, target: category });
            }}
          />
        )
      )}
      <CategoryFormDialog
        key={form.key}
        open={form.open}
        target={form.target}
        onClose={closeForm}
        onSaved={handleSaved}
        onFailed={handleFailed}
      />
      <ConfirmDialog
        open={deleteDialog.open}
        title={deleteDialog.target ? `${deleteDialog.target.name}を削除します。` : ''}
        message=""
        confirmLabel="削除する"
        onConfirm={handleDelete}
        onCancel={closeDelete}
      />
    </Stack>
  );
}
