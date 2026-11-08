// auth の API の呼び出し（詳細設計 auth/S-01_ログイン.md 7章）
import { apiPost } from '../../common/api/client';
import type { MeResponse } from '../../common/auth/types';
import type { LoginRequest } from './types';

/** A-01 ログイン。成功するとログイン中の人の情報（A-03 と同じ形）が返る */
export function login(request: LoginRequest): Promise<MeResponse> {
  return apiPost<MeResponse>('/api/auth/login', request);
}
