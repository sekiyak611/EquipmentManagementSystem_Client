// APIの呼び出し（API設計 2章、詳細設計 common.md 11.3・11.7）
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/_dev/components');
});

test('画面からAPIを呼び、返ってきた data を読める', async ({ page }) => {
  await page.getByRole('button', { name: 'GETを送る' }).click();
  await expect(page.getByTestId('api-result')).toHaveText('state=UP');
});

test('POST に CSRF の合言葉が付く（クッキーがないところからでも 403 にならない）', async ({ page, context }) => {
  // まだ合言葉のクッキーがない
  expect((await context.cookies()).find((c) => c.name === 'XSRF-TOKEN')).toBeUndefined();
  await page.getByRole('button', { name: 'POSTを送る' }).click();
  // A-01（ログイン）はまだないので 404。合言葉が通らなければ 403 になる
  await expect(page.getByTestId('api-result')).toHaveText('エラー 404');
  expect((await context.cookies()).find((c) => c.name === 'XSRF-TOKEN')).toBeDefined();
});

test('ログインが必要なAPIで 401 が返ると、ログイン画面（/login?redirect=…）に移る', async ({ page }) => {
  await page.getByRole('button', { name: 'ログインが必要なAPI' }).click();
  await expect(page).toHaveURL('/login?redirect=%2F_dev%2Fcomponents');
});
