// 画面のテストで、パスワード設定用のリンクを用意する部品。
// テストのとき、Server に用意してある API（POST・DELETE /api/test-support/password-links。詳細設計 common.md 3.14）を呼ぶ。
// 5分に1回の決まり（A-04）や、DM を経由せずに、S-03 などを確かめるために使う。本番・開発では動かない。
import type { APIRequestContext } from '@playwright/test';
import { DEV_PASSWORD } from './login';

/** リンクの用途（Server の PasswordLinkPurpose） */
export type PasswordLinkPurpose = 'RESET' | 'REGISTER' | 'LOCK';

/** 作ったリンクの値 */
export type IssuedLink = {
  /** 合言葉。S-03 は /password-set?token=<合言葉> で開く */
  token: string;
  purpose: PasswordLinkPurpose;
  expiresAt: string;
};

/** パスワード設定用のリンクを、全部消す（前のテストや前回の実行の依頼が、5分に1回の決まりに当たらないように、テストの前に使う） */
export async function clearPasswordLinks(request: APIRequestContext): Promise<void> {
  const response = await request.delete('/api/test-support/password-links');
  if (!response.ok()) {
    throw new Error(`パスワード設定用のリンクを消せませんでした（${response.status()}）`);
  }
}

/** そのメールアドレスのユーザに、指定した用途のリンクを作る（前のリンクは無効になる） */
export async function issuePasswordLink(
  request: APIRequestContext,
  email: string,
  purpose: PasswordLinkPurpose,
): Promise<IssuedLink> {
  const response = await request.post('/api/test-support/password-links', { data: { email, purpose } });
  if (!response.ok()) {
    throw new Error(`パスワード設定用のリンクを作れませんでした（${response.status()}）`);
  }
  const json = (await response.json()) as { data: IssuedLink };
  return json.data;
}

/**
 * 開発用のユーザのパスワードを、もとの（DEV_PASSWORD）に戻す。ロックされていれば解除し、失敗の回数も 0 に戻る。
 * パスワードを変える・ロックするテストが、終わったあとに使う（ほかのテストが、開発用のユーザでログインできるように）。
 * 再設定のリンクを作り、A-06 を呼ぶ（Server のテスト用 API と、本物の A-06 を使う）。
 */
export async function restoreDevPassword(request: APIRequestContext, email: string): Promise<void> {
  const { token } = await issuePasswordLink(request, email, 'RESET');
  // A-06 は POST なので、なりすまし対策の合言葉（XSRF-TOKEN）が要る。GET /api/health で受け取る
  await request.get('/api/health');
  const state = await request.storageState();
  const xsrf = state.cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? '';
  const response = await request.post('/api/auth/password-tokens/use', {
    headers: { 'X-XSRF-TOKEN': xsrf },
    data: { token, password: DEV_PASSWORD, passwordConfirm: DEV_PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`開発用のパスワードに戻せませんでした（${response.status()}）`);
  }
}
