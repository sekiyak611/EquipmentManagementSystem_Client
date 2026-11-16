// S-02 パスワード再設定の依頼（画面設計 1.2・5章、詳細設計 auth/S-02_パスワード再設定の依頼.md）
import { expect, test } from '@playwright/test';
import { DEV_USERS } from '../support/login';
import { clearPasswordLinks } from '../support/passwordLink';
import { clearSlackMessages, getSlackMessages } from '../support/slack';

const SENT_MESSAGE =
  '登録されているメールアドレスであれば、SlackのDMでパスワード設定用のリンクを送りました。届かない場合は、総務に連絡してください。';

const SERVER_ERROR_MESSAGE =
  '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。';

test('画面設計の項目と文が出ている。ヘッダーはシステム名だけ', async ({ page }) => {
  await page.goto('/password-reset');
  await expect(page.getByRole('heading', { name: 'パスワードの再設定' })).toBeVisible();
  await expect(page.getByText('登録しているメールアドレスを入力してください。', { exact: true })).toBeVisible();
  await expect(
    page.getByText('パスワードを設定するためのリンクを、SlackのDMでお送りします。', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('メールアドレス')).toHaveValue('');
  await expect(page.getByRole('button', { name: '送信', exact: true })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'ログイン画面に戻る' })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('banner').getByRole('link', { name: '備品管理' })).toBeVisible();
  await expect(page.getByTestId('header-user')).toHaveCount(0);
});

test('横にスクロールしない（スマートフォンの幅でも）', async ({ page }) => {
  await page.goto('/password-reset');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('ログイン画面の「パスワードを忘れた方はこちら」から開ける。「ログイン画面に戻る」で戻れる', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'パスワードを忘れた方はこちら' }).click();
  await expect(page).toHaveURL('/password-reset');
  await expect(page.getByRole('heading', { name: 'パスワードの再設定' })).toBeVisible();
  await page.getByRole('link', { name: 'ログイン画面に戻る' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
});

test('空のまま押すと、入力欄の下に「メールアドレスを入力してください」。サーバーを呼ばない', async ({ page }) => {
  let called = false;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/password-reset-requests')) {
      called = true;
    }
  });
  await page.goto('/password-reset');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByText('メールアドレスを入力してください', { exact: true })).toBeVisible();
  expect(called).toBe(false);
});

test('メールアドレスの形でなければ「メールアドレスの形が正しくありません」。サーバーを呼ばない', async ({ page }) => {
  let called = false;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/password-reset-requests')) {
      called = true;
    }
  });
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('soumu.example.com');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toBeVisible();
  expect(called).toBe(false);
});

test('メールアドレスが254文字を超えると「メールアドレスの形が正しくありません」。254文字は通る', async ({ page }) => {
  await page.goto('/password-reset');
  const tooLong = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`;
  expect(tooLong.length).toBe(255);
  await page.getByLabel('メールアドレス').fill(tooLong);
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toBeVisible();

  const maxLength = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
  expect(maxLength.length).toBe(254);
  await page.getByLabel('メールアドレス').fill(maxLength);
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
});

test('登録のないメールアドレスでも、同じ緑の帯の文が出る。入力欄の値は残り、この画面にとどまる。DMは送られない', async ({
  page,
  request,
}) => {
  await clearSlackMessages(request);
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
  await expect(page).toHaveURL('/password-reset');
  await expect(page.getByLabel('メールアドレス')).toHaveValue('nobody@example.com');
  await expect(page.getByRole('button', { name: '送信', exact: true })).toBeEnabled();
  expect(await getSlackMessages(request)).toHaveLength(0);
});

test('登録されているメールアドレス：同じ緑の帯の文が出て、本人にDM（①）が届く。5分以内の2回目も同じ文で、DMは増えない', async ({
  page,
  request,
}) => {
  // 同じメールアドレスへの依頼は5分に1回（A-04）。前のテストや前回の実行の依頼が残っていると、DMが送られないので、先にリンクを消す
  await clearPasswordLinks(request);
  const user = DEV_USERS.ippan;
  await clearSlackMessages(request);
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);

  const messages = await getSlackMessages(request);
  expect(messages).toHaveLength(1);
  expect(messages[0].email).toBe(user.email);
  expect(messages[0].title).toBe('【備品管理】パスワード再設定のご案内');
  expect(messages[0].body).toMatch(/\/password-set\?token=[A-Za-z0-9_-]{43}/);
  expect(messages[0].body).toContain('30分');

  // 5分以内に、もう一度送る：画面は同じ。DMは増えない
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
  expect(await getSlackMessages(request)).toHaveLength(1);
});

test('Enter でも送信できる', async ({ page }) => {
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByLabel('メールアドレス').press('Enter');
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
});

test('「送信」を2回続けて押しても、依頼の API は1回だけ呼ぶ', async ({ page }) => {
  let count = 0;
  await page.route('**/api/auth/password-reset-requests', async (route) => {
    count += 1;
    // 処理中の間に2回目を押せるよう、少し待ってから本物のサーバーに渡す
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByRole('button', { name: '送信', exact: true }).dblclick();
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
  expect(count).toBe(1);
});

test('処理中は「送信」を押せない', async ({ page }) => {
  await page.route('**/api/auth/password-reset-requests', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  const send = page.getByRole('button', { name: '送信', exact: true });
  await send.click();
  await expect(send).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
  await expect(send).toBeEnabled();
});

test('サーバーが入力の誤り（400）を返したら、入力欄の下にサーバーの文を出す', async ({ page }) => {
  await page.route('**/api/auth/password-reset-requests', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 400,
        message: '入力内容に誤りがあります。',
        data: null,
        errors: [{ field: 'email', message: 'メールアドレスの形が正しくありません' }],
      }),
    }),
  );
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('つながらないときは、赤の帯に「問題が発生しました…」。入力欄の値は残る', async ({ page }) => {
  await page.route('**/api/auth/password-reset-requests', (route) => route.abort());
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(SERVER_ERROR_MESSAGE);
  await expect(page.getByLabel('メールアドレス')).toHaveValue('nobody@example.com');
});

test('サーバーが 403 を返したら、赤の帯にサーバーの文を出す', async ({ page }) => {
  await page.route('**/api/auth/password-reset-requests', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ status: 403, message: 'この操作を行う権限がありません。', data: null, errors: null }),
    }),
  );
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('この操作を行う権限がありません。');
});

test('送信したあとの緑の帯は、入力の誤りで押し直すと消える', async ({ page }) => {
  await page.goto('/password-reset');
  await page.getByLabel('メールアドレス').fill('nobody@example.com');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(SENT_MESSAGE);
  await page.getByLabel('メールアドレス').fill('');
  await page.getByRole('button', { name: '送信', exact: true }).click();
  // 入力の誤りのときは、前の帯が消える
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText('メールアドレスを入力してください', { exact: true })).toBeVisible();
});
