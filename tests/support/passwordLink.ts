// 画面のテストで、パスワード設定用のリンクを用意する部品。
// テストのとき、Server に用意してある API（POST・DELETE /api/test-support/password-links。詳細設計 common.md 3.14）を呼ぶ。
// 5分に1回の決まり（A-04）や、DM を経由せずに、S-03 などを確かめるために使う。本番・開発では動かない。
import type { APIRequestContext } from '@playwright/test';

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
