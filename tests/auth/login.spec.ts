// S-01 ログイン・ヘッダーのログアウト（画面設計 1.1・1.4・2章、詳細設計 auth/S-01_ログイン.md）
import { expect, test } from '@playwright/test';
import { DEV_PASSWORD, DEV_USERS, fillAndLogin, loginAs } from '../support/login';

test('ログインせずにトップを開くと、ログイン画面（/login?redirect=…）に移る。ヘッダーはシステム名だけ', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login?redirect=%2F');
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: '備品管理' })).toBeVisible();
  await expect(page.getByTestId('header-user')).toHaveCount(0);
});

test('画面設計の項目と文が出ている', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('メールアドレス')).toBeVisible();
  await expect(page.getByLabel('パスワード', { exact: true })).toHaveAttribute('type', 'password');
  await expect(page.getByLabel('ログインしたままにする（60日間）')).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'パスワードを忘れた方はこちら' })).toHaveAttribute(
    'href',
    '/password-reset',
  );
  await expect(
    page.getByText('※5回続けて間違えると、パスワードの再設定が必要になります', { exact: true }),
  ).toBeVisible();
});

test('空のまま押すと、入力欄の下に「メールアドレスを入力してください」「パスワードを入力してください」', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByText('メールアドレスを入力してください', { exact: true })).toBeVisible();
  await expect(page.getByText('パスワードを入力してください', { exact: true })).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('メールアドレスの形でなければ「メールアドレスの形が正しくありません」', async ({ page }) => {
  await page.goto('/login');
  await fillAndLogin(page, 'soumu.example.com', DEV_PASSWORD);
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toBeVisible();
});

test('メールアドレスが254文字を超えると「メールアドレスの形が正しくありません」（サーバーを呼ばない）', async ({ page }) => {
  await page.goto('/login');
  let called = false;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/login')) {
      called = true;
    }
  });
  const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`;
  expect(email.length).toBe(255);
  await fillAndLogin(page, email, DEV_PASSWORD);
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toBeVisible();
  expect(called).toBe(false);
});

test('サーバーが入力の誤り（400）を返したら、入力欄の下にサーバーの文を出す', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
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
  await page.goto('/login');
  await fillAndLogin(page, DEV_USERS.soumu.email, DEV_PASSWORD);
  await expect(page.getByText('メールアドレスの形が正しくありません', { exact: true })).toBeVisible();
});

test('つながらないときは、赤の帯に「問題が発生しました…」', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.abort());
  await page.goto('/login');
  await fillAndLogin(page, DEV_USERS.soumu.email, DEV_PASSWORD);
  await expect(page.getByRole('alert')).toHaveText(
    '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。',
  );
});

test('「ログイン」を2回続けて押しても、ログインの API は1回だけ呼ぶ', async ({ page }) => {
  let count = 0;
  await page.route('**/api/auth/login', async (route) => {
    count += 1;
    // 処理中の間に2回目を押せるよう、少し待ってから本物のサーバーに渡す
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(DEV_USERS.soumu.email);
  await page.getByLabel('パスワード', { exact: true }).fill(DEV_PASSWORD);
  await page.getByRole('button', { name: 'ログイン', exact: true }).dblclick();
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.soumu.name);
  expect(count).toBe(1);
});

test('パスワードが違うと、赤の帯に「メールアドレスまたはパスワードが違います」。ログイン画面のまま', async ({ page }) => {
  await page.goto('/login');
  await fillAndLogin(page, DEV_USERS.soumu.email, 'wrong-password');
  await expect(page.getByRole('alert')).toHaveText('メールアドレスまたはパスワードが違います');
  await expect(page).toHaveURL('/login');
  await expect(page.getByTestId('header-user')).toHaveCount(0);
});

test('登録のないメールアドレスでも、同じ文', async ({ page }) => {
  await page.goto('/login');
  await fillAndLogin(page, 'nobody@example.com', DEV_PASSWORD);
  await expect(page.getByRole('alert')).toHaveText('メールアドレスまたはパスワードが違います');
});

test('目のマークを押すとパスワードの文字が出て、もう一度押すと伏せ字に戻る', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('パスワード', { exact: true });
  await password.fill('abc');
  await page.getByRole('button', { name: 'パスワードを表示する' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'パスワードを隠す' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('ログインすると最初の画面（/）に移り、ヘッダーに氏名が出る', async ({ page }) => {
  await loginAs(page, 'soumu');
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('top-placeholder')).toBeVisible();
});

test('Enter でもログインできる', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(DEV_USERS.ippan.email);
  await page.getByLabel('パスワード', { exact: true }).fill(DEV_PASSWORD);
  await page.getByLabel('パスワード', { exact: true }).press('Enter');
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.ippan.name);
});

test('ログインしたあとは、最初に開こうとした画面（redirect）に移る', async ({ page }) => {
  await page.goto('/login?redirect=%2F_dev%2Fcomponents');
  await fillAndLogin(page, DEV_USERS.soumu.email, DEV_PASSWORD);
  await expect(page).toHaveURL('/_dev/components');
});

for (const redirect of ['%2F%2Fexample.com', '%2F%5Cexample.com', '%2F%09%2Fexample.com', 'https%3A%2F%2Fexample.com']) {
  test(`redirect がほかのサイトを指していれば使わず、最初の画面（/）に移る（${redirect}）`, async ({ page }) => {
    await page.goto(`/login?redirect=${redirect}`);
    await fillAndLogin(page, DEV_USERS.soumu.email, DEV_PASSWORD);
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('top-placeholder')).toBeVisible();
  });
}

test('ログインしている人がログイン画面を開くと、最初の画面に移る', async ({ page }) => {
  await loginAs(page, 'ippan');
  await page.goto('/login');
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('top-placeholder')).toBeVisible();
});

test('ログイン画面と、ログインしたあとの画面は、横にスクロールしなくても使える', async ({ page }) => {
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await loginAs(page, 'soumu');
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test('ログインが切れたあとに「ログアウト」を押しても、redirect を付けずにログイン画面に移る', async ({ page, context }) => {
  await loginAs(page, 'soumu');
  // ログインが切れた形にする（セッションのクッキーを消す）
  await context.clearCookies({ name: 'JSESSIONID' });
  await page.getByTestId('header-user').click();
  await page.getByRole('menuitem', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL('/login');
});

test('ヘッダーの氏名を押して「ログアウト」を押すと、ログイン画面に移る。そのあとトップはログインが要る', async ({ page }) => {
  await loginAs(page, 'soumu');
  await page.getByTestId('header-user').click();
  await page.getByRole('menuitem', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByTestId('header-user')).toHaveCount(0);
  await page.goto('/');
  await expect(page).toHaveURL('/login?redirect=%2F');
});
