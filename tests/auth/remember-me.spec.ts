// ログインしたままにする（60日間。画面設計 2章・2.1 の6、詳細設計 auth/S-01_ログイン.md・common.md 3.17。ZPOP-125）
// 画面（S-01）は、チェックの値を送るだけ。ここでは、ブラウザのクッキーと、セッションが切れたあとの動きを確かめる。
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { DEV_PASSWORD, DEV_USERS, waitForFirstScreen } from '../support/login';
import { restoreDevPassword } from '../support/passwordLink';

const REMEMBER_COOKIE = 'remember-me';
const SESSION_COOKIE = 'JSESSIONID';
const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;

/** ログイン画面で、「ログインしたままにする」のチェックを選んで（remember）ログインする */
async function loginWith(page: Page, user: keyof typeof DEV_USERS, remember: boolean): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(DEV_USERS[user].email);
  await page.getByLabel('パスワード', { exact: true }).fill(DEV_PASSWORD);
  if (remember) {
    await page.getByLabel('ログインしたままにする（60日間）').check();
  }
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS[user].name);
  await waitForFirstScreen(page, user);
}

const cookieOf = async (context: BrowserContext, name: string) =>
  (await context.cookies()).find((cookie) => cookie.name === name);

/** サーバーのセッションが切れた状態にする（ブラウザを閉じた・60日の間に、セッションが切れた、と同じ） */
async function dropSession(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: SESSION_COOKIE });
  expect(await cookieOf(context, SESSION_COOKIE)).toBeUndefined();
}

test('チェックを付けてログインすると、60日間のクッキー remember-me ができる（プログラムから読めない）', async ({
  page,
  context,
}) => {
  await loginWith(page, 'ippan', true);
  const cookie = await cookieOf(context, REMEMBER_COOKIE);
  expect(cookie).toBeDefined();
  expect(cookie?.httpOnly).toBe(true);
  // 有効期限は、今から60日後（前後1日）
  const remaining = (cookie?.expires ?? 0) - Date.now() / 1000;
  expect(remaining).toBeGreaterThan(SIXTY_DAYS_SECONDS - 24 * 60 * 60);
  expect(remaining).toBeLessThan(SIXTY_DAYS_SECONDS + 24 * 60 * 60);
});

test('チェックを付けずにログインすると、remember-me のクッキーはできない', async ({ page, context }) => {
  await loginWith(page, 'ippan', false);
  expect(await cookieOf(context, REMEMBER_COOKIE)).toBeUndefined();
});

test('チェックを付けた：セッションが切れても、画面を開き直すと、ログインしたまま（氏名が出る）。続けて操作できる', async ({
  page,
  context,
}) => {
  await loginWith(page, 'ippan', true);
  const before = await cookieOf(context, REMEMBER_COOKIE);
  await dropSession(context);

  await page.goto('/');
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.ippan.name);
  // ログイン画面には移らない
  await expect(page).toHaveURL('/my-equipment');
  // 自動でログインし直すたびに、合言葉は新しくなる（クッキーの値が変わる）
  const after = await cookieOf(context, REMEMBER_COOKIE);
  expect(after).toBeDefined();
  expect(after?.value).not.toBe(before?.value);
  // 新しいセッションで、続けて開ける（ログインが要る画面）
  await page.goto('/password-change');
  await expect(page.getByRole('heading', { name: 'パスワード変更' })).toBeVisible();
});

test('チェックを付けない：セッションが切れると、画面を開き直したとき、ログイン画面に移る', async ({ page, context }) => {
  await loginWith(page, 'ippan', false);
  await dropSession(context);

  await page.goto('/');
  await expect(page).toHaveURL('/login?redirect=%2F');
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
});

test('ログアウトすると、remember-me のクッキーが消え、セッションが切れても、ログインしたままにならない', async ({
  page,
  context,
}) => {
  await loginWith(page, 'ippan', true);
  await page.getByTestId('header-user').click();
  await page.getByRole('menuitem', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL('/login');
  expect(await cookieOf(context, REMEMBER_COOKIE)).toBeUndefined();

  await dropSession(context);
  await page.goto('/');
  await expect(page).toHaveURL('/login?redirect=%2F');
});

test('チェックを付けずにログインし直すと、前の remember-me のクッキーが消える', async ({ page, context }) => {
  await loginWith(page, 'ippan', true);
  expect(await cookieOf(context, REMEMBER_COOKIE)).toBeDefined();
  await page.getByTestId('header-user').click();
  await page.getByRole('menuitem', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL('/login');

  await loginWith(page, 'ippan', false);
  expect(await cookieOf(context, REMEMBER_COOKIE)).toBeUndefined();
});

test('別の端末でパスワードを変更すると、この端末の「ログインしたまま」は切れる（セッションが切れたあとの画面は、ログイン画面）', async ({
  page,
  context,
  browser,
  request,
}) => {
  // 端末A（page）：ログインしたままにする
  await loginWith(page, 'ippan', true);
  const otherDevice = await browser.newContext({ baseURL: 'http://localhost:5173' });
  try {
    // 端末B：ログインして、S-04 でパスワードを変える（ログインしたままにはしない）
    const other = await otherDevice.newPage();
    await loginWith(other, 'ippan', false);
    await other.goto('/password-change');
    await other.getByLabel('現在のパスワード', { exact: true }).fill(DEV_PASSWORD);
    await other.getByLabel('新しいパスワード', { exact: true }).fill('Xq7#kd9!Lm2');
    await other.getByLabel('新しいパスワード（確認）', { exact: true }).fill('Xq7#kd9!Lm2');
    await other.getByRole('button', { name: '変更する', exact: true }).click();
    await expect(other.getByRole('status')).toHaveText('パスワードを変更しました');

    // 端末A：セッションが切れたあと、「ログインしたまま」では入れない
    await dropSession(context);
    await page.goto('/');
    await expect(page).toHaveURL('/login?redirect=%2F');
  } finally {
    await otherDevice.close();
    await restoreDevPassword(request, DEV_USERS.ippan.email);
  }
});
