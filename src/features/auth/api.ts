// auth の API の呼び出し（詳細設計 auth/S-01_ログイン.md・S-02_パスワード再設定の依頼.md の7章）
import { apiPost } from '../../common/api/client';
import type { MeResponse } from '../../common/auth/types';
import type { LoginRequest, PasswordResetRequest } from './types';

/** A-01 ログイン。成功するとログイン中の人の情報（A-03 と同じ形）が返る */
export function login(request: LoginRequest): Promise<MeResponse> {
  return apiPost<MeResponse>('/api/auth/login', request);
}

/**
 * A-04 パスワード設定用のリンクの依頼。登録の有無・5分以内かどうか・DMを送れたかにかかわらず、
 * 成功（202）は同じ（返す値はない。他人に登録の有無を知らせないため）
 */
export function requestPasswordReset(request: PasswordResetRequest): Promise<null> {
  return apiPost<null>('/api/auth/password-reset-requests', request);
}
