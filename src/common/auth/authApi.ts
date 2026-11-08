// ログイン中の人の API の呼び出し（common.md 11.9）。ログイン（A-01）は features/auth/api.ts
import { apiGet, apiPost } from '../api/client';
import type { MeResponse } from './types';

/** A-03 ログイン中の人の情報。ログインしていなければ 401 の ApiError（ログイン画面には移さない） */
export function getMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('/api/auth/me', { redirectOnUnauthorized: false });
}

/**
 * A-02 ログアウト。ログインがすでに切れていれば 401 の ApiError（ログイン画面には移さない。
 * 呼ぶ側が、redirect を付けずにログイン画面へ移すため）
 */
export function logout(): Promise<null> {
  return apiPost<null>('/api/auth/logout', undefined, { redirectOnUnauthorized: false });
}
