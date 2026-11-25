// S-05 自分の備品（画面設計 3章、詳細設計 equipment/mine/S-05_自分の備品.md）。スマートフォン優先の画面（画面一覧 7章）
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router';
import { ApiError } from '../../../../common/api/client';
import { useApi } from '../../../../common/api/useApi';
import { useAuth } from '../../../../common/auth/AuthProvider';
import { hasPermission } from '../../../../common/auth/permissions';
import { ConfirmDialog } from '../../../../common/components/ConfirmDialog';
import { ApiErrorPage, ErrorPage } from '../../../../common/components/ErrorPage';
import { useMessage } from '../../../../common/components/MessageProvider';
import { confirmEquipment, getMyLoans } from '../api';
import { MyEquipmentCard } from '../components/MyEquipmentCard';
import { MyEquipmentNotice } from '../components/MyEquipmentNotice';
import { ReturnDialog } from '../components/ReturnDialog';
import type { MyLoanItemResponse, MyLoansResponse } from '../types';

/** この画面を開ける権限項目（データ設計 5.3「備品を借りる・返す（自分）」） */
const LOAN_SELF = 'LOAN_SELF';
/** 確認の操作ができる権限項目（「自分の備品を確認する」。10章 No.5） */
const CONFIRM_SELF = 'CONFIRM_SELF';

export function MyEquipmentPage() {
  const { me } = useAuth();
  if (!hasPermission(me, LOAN_SELF)) {
    // 権限がない人には、エラー画面（S-19。権限がない）を出す。一覧（B-01）は読まない（詳細設計 S-05 の6章）
    return <ErrorPage kind="forbidden" />;
  }
  return <MyEquipment canConfirm={hasPermission(me, CONFIRM_SELF)} />;
}

/** 返すダイアログの状態。key は開くたびに変え、入力欄を作り直す。閉じる途中も備品を出しておくため、target は閉じても残す */
type ReturnState = { open: boolean; target: MyLoanItemResponse | null; key: number };

function MyEquipment({ canConfirm }: { canConfirm: boolean }) {
  const message = useMessage();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => getMyLoans(), []);
  // B-03・B-04 が返した最新の一覧。なければ null（画面に出すのは latest ?? data。7章）
  const [latest, setLatest] = useState<MyLoansResponse | null>(null);
  // 「まとめて確認した」のダイアログ。開いたときの備品の ID を持つ（題の N と送る備品を同じにする。閉じる途中も値を残す）
  const [confirmAll, setConfirmAll] = useState<{ open: boolean; ids: number[] }>({ open: false, ids: [] });
  // 読み直しの段階。useApi は読み込み中も前の値を持ち、loading が true になるのも1回遅れるため、
  // 読み直しを頼んでから終わるまで、一覧を隠す（6章）
  const [refreshPhase, setRefreshPhase] = useState<'idle' | 'waiting' | 'loading'>('idle');
  const [returnState, setReturnState] = useState<ReturnState>({ open: false, target: null, key: 0 });
  // 確認・返却を送っている間は、一覧のすべての操作ボタンを押せなくする（5章）
  const [busy, setBusy] = useState(false);

  const list = latest ?? data;

  useEffect(() => {
    if (refreshPhase === 'waiting' && loading) {
      setRefreshPhase('loading');
    } else if (refreshPhase === 'loading' && !loading) {
      setRefreshPhase('idle');
    }
  }, [refreshPhase, loading]);

  /** 一覧を最新にする：持っている一覧を捨てて、B-01 を読み直す（読み直しの間は、一覧を隠す。6章） */
  const refresh = () => {
    setLatest(null);
    setRefreshPhase('waiting');
    reload();
  };

  /**
   * 赤の帯に出す失敗（9.2）。帯がダイアログの後ろに隠れないようダイアログを閉じる。
   * 一覧を最新にするのは、400・404・409 と、確認（B-04）の 403（権限がなければ、読み直しが 403 になり S-19 が出る）。
   * 返す（B-03）の 403 と、500・つながらないときは、一覧はそのまま
   */
  const handleFailed = (e: ApiError, kind: 'confirm' | 'return') => {
    setConfirmAll((prev) => ({ ...prev, open: false }));
    setReturnState((prev) => ({ ...prev, open: false }));
    if (e.status === 401) {
      // 401 は common/api がログイン画面に移す
      return;
    }
    message.error(e.message);
    if (e.status === 400 || e.status === 404 || e.status === 409 || (e.status === 403 && kind === 'confirm')) {
      refresh();
    }
  };

  /** 確認する（B-04）。1件でも、まとめてでも同じ API。successText は成功の帯の文 */
  const confirm = async (equipmentIds: number[], successText: string) => {
    message.clear();
    setBusy(true);
    try {
      const updated = await confirmEquipment({ equipmentIds });
      setConfirmAll((prev) => ({ ...prev, open: false }));
      setLatest(updated);
      message.success(successText);
    } catch (e) {
      handleFailed(e instanceof ApiError ? e : new ApiError(0, String(e), null), 'confirm');
    } finally {
      setBusy(false);
    }
  };

  const handleReturned = (updated: MyLoansResponse, target: MyLoanItemResponse) => {
    setReturnState((prev) => ({ ...prev, open: false }));
    setLatest(updated);
    message.success(`返却しました（${target.managementNo}）`);
  };

  // 画面を開いて読み込むのに失敗したら、S-19 を出す（common.md 11.10）。操作のあとの読み直しが失敗したときも同じ
  if (error) {
    return <ApiErrorPage error={error} />;
  }

  return (
    <Container maxWidth="sm" disableGutters>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography variant="h5" component="h1">
          自分の備品
        </Typography>
        {loading || refreshPhase !== 'idle' || !list ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress data-testid="my-equipment-loading" />
          </Box>
        ) : list.items.length === 0 ? (
          <Typography data-testid="my-equipment-empty">借りている備品はありません。</Typography>
        ) : (
          <>
            <MyEquipmentNotice list={list} />
            {canConfirm && list.unconfirmedCount >= 1 && (
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => {
                  message.clear();
                  setConfirmAll({
                    open: true,
                    ids: list.items.filter((item) => !item.confirmedThisMonth).map((item) => item.equipmentId),
                  });
                }}
                sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
              >
                まとめて確認した（{list.unconfirmedCount}件）
              </Button>
            )}
            {list.items.map((item) => (
              <MyEquipmentCard
                key={item.loanId}
                item={item}
                canConfirm={canConfirm}
                busy={busy}
                onConfirm={(target) => confirm([target.equipmentId], `確認しました（${target.managementNo}）`)}
                onReturn={(target) => {
                  message.clear();
                  setReturnState((prev) => ({ open: true, target, key: prev.key + 1 }));
                }}
              />
            ))}
          </>
        )}
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => navigate('/borrow')}
          sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
        >
          ＋ 備品を借りる
        </Button>
      </Stack>
      <ReturnDialog
        key={returnState.key}
        open={returnState.open}
        target={returnState.target}
        onClose={() => setReturnState((prev) => ({ ...prev, open: false }))}
        onReturned={handleReturned}
        onFailed={(e) => handleFailed(e, 'return')}
        onSubmittingChange={setBusy}
      />
      <ConfirmDialog
        open={confirmAll.open}
        title={`${confirmAll.ids.length}件の備品を確認済みにします。手元にあることを確かめましたか？`}
        message=""
        confirmLabel="確認した"
        onConfirm={() =>
          confirm(confirmAll.ids, `${confirmAll.ids.length}件の備品を確認しました`)
        }
        onCancel={() => setConfirmAll((prev) => ({ ...prev, open: false }))}
      />
    </Container>
  );
}
