// 全画面の枠とヘッダー（画面設計 1.1、詳細設計 common.md 11.4・11.7）
import { expect, test } from '@playwright/test';

test('ヘッダーに「備品管理」が出て、押すとトップに戻る', async ({ page }) => {
  await page.goto('/no-such-page');
  const title = page.getByRole('banner').getByRole('link', { name: '備品管理' });
  await expect(title).toBeVisible();
  await title.click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('top-placeholder')).toBeVisible();
});

test('横にスクロールしなくても使える', async ({ page }) => {
  await page.goto('/_dev/components');
  await expect(page.getByText('共通部品の見本（開発とテストだけ）')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('ないアドレスでは「ページが見つかりません。」', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByTestId('not-found')).toHaveText('ページが見つかりません。');
});
