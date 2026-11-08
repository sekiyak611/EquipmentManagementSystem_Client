// 共通部品（画面設計 1.2・1.3、詳細設計 common.md 11.5・11.6・11.7）
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // 時計を止めて、5秒・1秒の待ち時間をテストの中で進められるようにする
  await page.clock.install();
  await page.goto('/_dev/components');
});

test('完了の帯は緑で出て、5秒で消える', async ({ page }) => {
  await page.getByRole('button', { name: '完了の帯' }).click();
  const bar = page.getByTestId('message-bar');
  await expect(bar).toHaveText('借りました（A001）');
  await expect(bar).toHaveClass(/MuiAlert-colorSuccess/);
  // テストの時計は実際の時間でも少し進むので、境目の前後に余裕を持たせて確かめる
  await page.clock.runFor(4_000);
  await expect(bar).toBeVisible();
  await page.clock.runFor(1_500);
  await expect(bar).toBeHidden();
});

test('操作できなかったときの帯は赤で出て、×を押すまで残る', async ({ page }) => {
  await page.getByRole('button', { name: '失敗の帯' }).click();
  const bar = page.getByTestId('message-bar');
  await expect(bar).toHaveText('この備品はすでに貸し出されています');
  await expect(bar).toHaveClass(/MuiAlert-colorError/);
  await page.clock.runFor(10_000);
  await expect(bar).toBeVisible();
  await bar.getByRole('button').click();
  await expect(bar).toBeHidden();
});

test('確認ダイアログは「キャンセル」と窓の外で閉じる', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: 'ダイアログを開く' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'ダイアログを開く' }).click();
  await expect(dialog).toBeVisible();
  // 窓の外（左上の隅）を押す
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('run-count')).toHaveText('動いた回数：0');
});

test('確認ダイアログで実行すると、処理が1回だけ動き、終わるまで実行ボタンを押せない', async ({ page }) => {
  await page.getByRole('button', { name: 'ダイアログを開く' }).click();
  const run = page.getByRole('dialog').getByRole('button', { name: '実行する' });
  await run.click();
  await expect(run).toBeDisabled();
  await run.click({ force: true });
  await page.clock.runFor(1_000);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('run-count')).toHaveText('動いた回数：1');
  await expect(page.getByTestId('message-bar')).toHaveText('実行しました');
});

test('押したボタンは、処理が終わるまで押せない（2回押しても1回だけ動く）', async ({ page }) => {
  const button = page.getByRole('button', { name: '1秒かかる処理' });
  await button.dblclick();
  await expect(button).toBeDisabled();
  await page.clock.runFor(1_000);
  await expect(button).toBeEnabled();
  await expect(page.getByTestId('run-count')).toHaveText('動いた回数：1');
});

test('日付は 2026/11/02 と 2026/11/02（月）、空の値は「―」', async ({ page }) => {
  await expect(page.getByTestId('format-date')).toHaveText('2026/11/02');
  await expect(page.getByTestId('format-weekday')).toHaveText('2026/11/02（月）');
  await expect(page.getByTestId('format-datetime')).toHaveText('2026/11/25');
  await expect(page.getByTestId('format-empty')).toHaveText('―');
});
