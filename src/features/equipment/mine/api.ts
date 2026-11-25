// mine（自分の備品）の API の呼び出し（詳細設計 equipment/mine/S-05_自分の備品.md 7章）
import { apiGet, apiPost } from '../../../common/api/client';
import type { ConfirmRequest, MyLoansResponse, ReturnRequest } from './types';

/** B-01 自分が借りている備品の一覧と、今月の確認の案内 */
export function getMyLoans(): Promise<MyLoansResponse> {
  return apiGet<MyLoansResponse>('/api/me/loans');
}

/** B-04 確認した（1件でも配列で送る）。更新したあとの最新の一覧が返る */
export function confirmEquipment(request: ConfirmRequest): Promise<MyLoansResponse> {
  return apiPost<MyLoansResponse>('/api/me/confirmations', request);
}

/** B-03 備品を返す。返却日は送らない（サーバーが今日の日付を入れる）。返したあとの最新の一覧が返る */
export function returnLoan(loanId: number, request: ReturnRequest): Promise<MyLoansResponse> {
  return apiPost<MyLoansResponse>(`/api/me/loans/${loanId}/return`, request);
}
