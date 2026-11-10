// 画面のテストでログインするための部品（詳細設計 auth/S-01_ログイン.md）。
// 開発用のユーザ（Server の db/devdata。詳細設計 common.md 4章）を使う
import { expect, type Page } from '@playwright/test';

/** 開発用のユーザ（パスワードは開発とテストのためだけのもの） */
export const DEV_USERS = {
  soumu: { email: 'soumu@example.com', name: '開発 総務' },
  ippan: { email: 'ippan@example.com', name: '開発 一般' },
} as const;

export const DEV_PASSWORD = 'devpass-1234';

/** ログイン画面で、メールアドレスとパスワードを入れて「ログイン」を押す */
export async function fillAndLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
}

/** ログイン画面を開いてログインし、ヘッダーに氏名が出るまで待つ */
export async function loginAs(page: Page, user: keyof typeof DEV_USERS): Promise<void> {
  await page.goto('/login');
  await fillAndLogin(page, DEV_USERS[user].email, DEV_PASSWORD);
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS[user].name);
}
