// auth の API の呼び出し（詳細設計 auth/S-01_ログイン.md・S-02_パスワード再設定の依頼.md・S-03_パスワード設定.md の7章）
import { apiPost } from '../../common/api/client';
import type { MeResponse } from '../../common/auth/types';
import type {
  LoginRequest,
  PasswordResetRequest,
  PasswordTokenUseRequest,
  PasswordTokenVerifyRequest,
  PasswordTokenVerifyResponse,
} from './types';

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

/**
 * A-05 合言葉の確認。リンクが使えるときだけ成功し、対象のメールアドレスと用途が返る。
 * 使えないとき（ない・使用済み・より新しいリンクがある・期限切れ・削除されたユーザ）は 400（message は S-03 に出す文）。
 * リンクを開いただけでは、使用済みにしない。
 */
export function verifyPasswordToken(request: PasswordTokenVerifyRequest): Promise<PasswordTokenVerifyResponse> {
  return apiPost<PasswordTokenVerifyResponse>('/api/auth/password-tokens/verify', request);
}

/** A-06 合言葉でパスワードを決める。成功しても、ログインはさせない（返す値はない） */
export function setPasswordWithToken(request: PasswordTokenUseRequest): Promise<null> {
  return apiPost<null>('/api/auth/password-tokens/use', request);
}
