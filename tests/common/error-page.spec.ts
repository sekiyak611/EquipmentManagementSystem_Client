// S-19 エラー（画面設計 22章、詳細設計 common.md 11.10、テスト方針 5章）。スマートフォン優先の画面なので、両方の大きさで動かす。
// 画面を開いて読み込む API の失敗は、S-13 種別管理（/categories。開くと K-01 を読む）の答えを差し替えて確かめる
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from '../support/login';

const FORBIDDEN = 'このページを見る権限がありません。';
const NOT_FOUND = 'ページが見つかりません。';
const SYSTEM_ERROR = '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。';

/** S-19 の文と「最初の画面へ」が出ている。横にスクロールしない */
async function expectErrorPage(page: Page, text: string) {
  await expect(page.getByTestId('error-page')).toHaveText(text);
  await expect(page.getByRole('link', { name: '最初の画面へ' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** K-01（GET /api/categories）の答えを差し替える */
async function replaceCategoryList(page: Page, status: number, message: string) {
  await page.route('**/api/categories', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status, json: { status, message, data: null, errors: null } })
      : route.fallback(),
  );
}

test('ないアドレスでは「ページが見つかりません。」。「最初の画面へ」で最初の画面に移る', async ({ page }) => {
  await loginAs(page, 'soumu');
  await page.goto('/no-such-page');
  await expectErrorPage(page, NOT_FOUND);
  // アドレスは開こうとしたまま
  await expect(page).toHaveURL('/no-such-page');
  // ヘッダーは残る
  await expect(page.getByRole('banner').getByRole('link', { name: '備品管理' })).toBeVisible();
  await page.getByRole('link', { name: '最初の画面へ' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('top-placeholder')).toBeVisible();
});

test('ログインしていなくても、ないアドレスでは「ページが見つかりません。」', async ({ page }) => {
  await page.goto('/no-such-page');
  await expectErrorPage(page, NOT_FOUND);
});

test('開くときの API が 500 なら「問題が発生しました…」。サーバーの詳しい中身は出さない', async ({ page }) => {
  await loginAs(page, 'soumu');
  await replaceCategoryList(page, 500, 'NullPointerException at Foo.java:12');
  await page.goto('/categories');
  await expectErrorPage(page, SYSTEM_ERROR);
  await expect(page.getByText('NullPointerException')).toHaveCount(0);
  await expect(page).toHaveURL('/categories');
});

test('開くときにつながらなければ「問題が発生しました…」', async ({ page }) => {
  await loginAs(page, 'soumu');
  await page.route('**/api/categories', (route) => route.abort());
  await page.goto('/categories');
  await expectErrorPage(page, SYSTEM_ERROR);
});

test('開くときの API が 403 なら「このページを見る権限がありません。」', async ({ page }) => {
  await loginAs(page, 'soumu');
  await replaceCategoryList(page, 403, 'この操作を行う権限がありません。');
  await page.goto('/categories');
  await expectErrorPage(page, FORBIDDEN);
});

test('開くときの API が 404 なら「ページが見つかりません。」', async ({ page }) => {
  await loginAs(page, 'soumu');
  await replaceCategoryList(page, 404, '対象が見つかりません。');
  await page.goto('/categories');
  await expectErrorPage(page, NOT_FOUND);
});

test('開くときの API が 401 ならエラー画面ではなく、ログイン画面に移る', async ({ page }) => {
  await loginAs(page, 'soumu');
  await replaceCategoryList(page, 401, 'ログインしてください。');
  await page.goto('/categories');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByTestId('error-page')).toHaveCount(0);
});

test('画面を描く途中で不具合が起きたら「問題が発生しました…」。ヘッダーは残る', async ({ page }) => {
  await page.goto('/_dev/crash');
  await expectErrorPage(page, SYSTEM_ERROR);
  await expect(page.getByText('画面の不具合の見本')).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('link', { name: '備品管理' })).toBeVisible();
});
