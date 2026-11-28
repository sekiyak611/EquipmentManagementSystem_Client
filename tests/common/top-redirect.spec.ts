// ログイン後の最初の画面（/）の移し先（common/components/TopPlaceholderPage。ZPOP-442）。
// 詳細設計 equipment/mine/S-05_自分の備品.md の1章・6章・10章 No.2・13・14
import { expect, test } from '@playwright/test';
import { loginAs } from '../support/login';

test('一般社員（homePage が MY_EQUIPMENT）が / を開くと、/my-equipment に移る', async ({ page }) => {
  await loginAs(page, 'ippan');
  await page.goto('/');
  await expect(page).toHaveURL('/my-equipment');
  await expect(page.getByRole('heading', { name: '自分の備品' })).toBeVisible();
});

test('一般社員がヘッダーの「備品管理」を押すと、/my-equipment に移る', async ({ page }) => {
  await loginAs(page, 'ippan');
  await page.goto('/no-such-page');
  await page.getByRole('banner').getByRole('link', { name: '備品管理' }).click();
  await expect(page).toHaveURL('/my-equipment');
});

test('移ったあと、ブラウザの「戻る」で / に戻って、また移るのを繰り返さない（置き換えで移る）', async ({ page }) => {
  await loginAs(page, 'ippan');
  await page.goto('/no-such-page');
  await page.goto('/');
  await expect(page).toHaveURL('/my-equipment');
  await page.goBack();
  await expect(page).toHaveURL('/no-such-page');
});

test('総務（homePage が EQUIPMENT_LIST）は、S-07 ができるまで、/ の仮の画面のまま', async ({ page }) => {
  await loginAs(page, 'soumu');
  await page.goto('/');
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('top-placeholder')).toBeVisible();
});
