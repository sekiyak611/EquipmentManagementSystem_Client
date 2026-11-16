// S-03 パスワード設定（画面設計 1.2・6章・8章、詳細設計 auth/S-03_パスワード設定.md）
// 本物のサーバーを使う。パスワードを決めるテストは、ほかのテスト（総務・一般社員でログイン）に影響しないよう、
// パスワードがまだない最初の総務の担当者（admin@example.com。Server のテスト用の設定）で行う。
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { issuePasswordLink, type PasswordLinkPurpose } from '../support/passwordLink';

const ADMIN_EMAIL = 'admin@example.com';
const NEW_PASSWORD = 'Xq7#kd9!Lm2';

const UNUSABLE_MESSAGE = 'このリンクは使えません。有効期限が切れたか、すでに使われています。';
const DONE_MESSAGE = 'パスワードを設定しました。新しいパスワードでログインしてください。';
const SERVER_ERROR_MESSAGE =
  '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。';

/** リンクを作って、その画面を開く。合言葉を返す */
async function openLink(
  page: Page,
  request: APIRequestContext,
  purpose: PasswordLinkPurpose = 'RESET',
): Promise<string> {
  const { token } = await issuePasswordLink(request, ADMIN_EMAIL, purpose);
  await page.goto(`/password-set?token=${token}`);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toBeVisible();
  return token;
}

async function fillPasswords(page: Page, password: string, confirm: string = password): Promise<void> {
  await page.getByLabel('新しいパスワード', { exact: true }).fill(password);
  await page.getByLabel('新しいパスワード（確認）', { exact: true }).fill(confirm);
}

const setButton = (page: Page) => page.getByRole('button', { name: '設定する', exact: true });

test('再設定のリンク：見出し「パスワードの再設定」、対象のメールアドレス、2つの入力欄、決まり、「設定する」が出る。ヘッダーはシステム名だけ', async ({
  page,
  request,
}) => {
  await openLink(page, request, 'RESET');
  await expect(page.getByRole('heading', { name: 'パスワードの再設定' })).toBeVisible();
  await expect(page.getByTestId('password-set-email')).toHaveText(ADMIN_EMAIL);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveAttribute('type', 'password');
  await expect(page.getByLabel('新しいパスワード（確認）', { exact: true })).toHaveAttribute('type', 'password');
  await expect(page.getByText('・8文字以上、64文字以内', { exact: true })).toBeVisible();
  await expect(page.getByText('・使える文字：半角の英字・数字・記号・スペース', { exact: true })).toBeVisible();
  await expect(setButton(page)).toBeEnabled();
  await expect(page.getByRole('banner').getByRole('link', { name: '備品管理' })).toBeVisible();
  await expect(page.getByTestId('header-user')).toHaveCount(0);
});

test('ユーザ登録のリンク（REGISTER）：見出しが「パスワードの設定」。ロックのリンク（LOCK）：「パスワードの再設定」', async ({
  page,
  request,
}) => {
  await openLink(page, request, 'REGISTER');
  await expect(page.getByRole('heading', { name: 'パスワードの設定', exact: true })).toBeVisible();
  await openLink(page, request, 'LOCK');
  await expect(page.getByRole('heading', { name: 'パスワードの再設定' })).toBeVisible();
});

test('横にスクロールしない（スマートフォンの幅でも）', async ({ page, request }) => {
  await openLink(page, request);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('入力欄は新しいパスワード用（autocomplete=new-password）。貼り付けを止めない', async ({ page, request }) => {
  await openLink(page, request);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.getByLabel('新しいパスワード（確認）', { exact: true })).toHaveAttribute(
    'autocomplete',
    'new-password',
  );
});

test('目のマークを押すと、その欄の文字が出て、もう一度押すと伏せ字に戻る', async ({ page, request }) => {
  await openLink(page, request);
  const password = page.getByLabel('新しいパスワード', { exact: true });
  const confirm = page.getByLabel('新しいパスワード（確認）', { exact: true });
  await fillPasswords(page, 'abc');
  await page.getByRole('button', { name: 'パスワードを表示する' }).first().click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(confirm).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'パスワードを隠す' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('入力中に、決まりの前が「・」から「✓」に変わる（8〜64文字・使える文字）', async ({ page, request }) => {
  await openLink(page, request);
  const length = (mark: string) => page.getByText(`${mark}8文字以上、64文字以内`, { exact: true });
  const chars = (mark: string) => page.getByText(`${mark}使える文字：半角の英字・数字・記号・スペース`, { exact: true });
  const password = page.getByLabel('新しいパスワード', { exact: true });

  await expect(length('・')).toBeVisible();
  await expect(chars('・')).toBeVisible();

  await password.fill('abc');
  await expect(length('・')).toBeVisible();
  await expect(chars('✓')).toBeVisible();

  await password.fill('abcdefgh');
  await expect(length('✓')).toBeVisible();
  await expect(chars('✓')).toBeVisible();

  await password.fill('a'.repeat(64));
  await expect(length('✓')).toBeVisible();
  await password.fill('a'.repeat(65));
  await expect(length('・')).toBeVisible();

  await password.fill('パスワードパスワード');
  await expect(length('✓')).toBeVisible();
  await expect(chars('・')).toBeVisible();
});

test('空のまま押すと、「新しいパスワードを入力してください」。サーバーを呼ばない', async ({ page, request }) => {
  await openLink(page, request);
  let called = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/auth/password-tokens/use')) {
      called = true;
    }
  });
  await setButton(page).click();
  await expect(page.getByText('新しいパスワードを入力してください', { exact: true })).toBeVisible();
  await expect(page.getByText('確認用のパスワードが一致しません', { exact: true })).toHaveCount(0);
  expect(called).toBe(false);
});

test('短い・長い・使えない文字：1つの欄に、画面設計 8章の文を1つだけ出す。サーバーを呼ばない', async ({
  page,
  request,
}) => {
  await openLink(page, request);
  let called = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/auth/password-tokens/use')) {
      called = true;
    }
  });
  const cases: Array<[string, string]> = [
    ['Xq7#kd9', 'パスワードは8文字以上で入力してください'],
    ['Xq7#kd9!'.repeat(8) + 'a', 'パスワードは64文字以内で入力してください'],
    ['パスワードパスワード', 'パスワードに使えるのは、半角の英字・数字・記号・スペースです'],
  ];
  for (const [password, expected] of cases) {
    await fillPasswords(page, password);
    await setButton(page).click();
    await expect(page.getByText(expected, { exact: true })).toBeVisible();
  }
  expect(called).toBe(false);
});

test('確認が違うと、確認の欄の下に「確認用のパスワードが一致しません」', async ({ page, request }) => {
  await openLink(page, request);
  await fillPasswords(page, NEW_PASSWORD, `${NEW_PASSWORD}x`);
  await setButton(page).click();
  await expect(page.getByText('確認用のパスワードが一致しません', { exact: true })).toBeVisible();
});

test('よく使われるパスワードは、サーバーが断る：入力欄の下に画面設計 8章の文。リンクは使えたままで、別のパスワードで設定できる', async ({
  page,
  request,
}) => {
  await openLink(page, request);
  await fillPasswords(page, 'qwertyuiop');
  await setButton(page).click();
  await expect(
    page.getByText('このパスワードはよく使われているため、使えません。別のパスワードにしてください', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/password-set\?token=/);

  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();
  await expect(page).toHaveURL('/login');
});

test('設定できると、ログイン画面（/login）に移り、緑の帯「パスワードを設定しました。…」が出る。自動ではログインしない。新しいパスワードでログインできる', async ({
  page,
  request,
}) => {
  await openLink(page, request, 'REGISTER');
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();

  // 合言葉を含むアドレスは、履歴に残さない（replace）
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('status')).toHaveText(DONE_MESSAGE);
  await expect(page.getByTestId('header-user')).toHaveCount(0);

  await page.getByLabel('メールアドレス').fill(ADMIN_EMAIL);
  await page.getByLabel('パスワード', { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByTestId('header-user')).toBeVisible();
});

test('使ったリンクをもう一度開くと、「このリンクは使えません。…」と「パスワード再設定の依頼へ」が出る', async ({
  page,
  request,
}) => {
  const token = await openLink(page, request);
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();
  await expect(page).toHaveURL('/login');

  await page.goto(`/password-set?token=${token}`);
  await expect(page.getByText(UNUSABLE_MESSAGE, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'パスワード再設定の依頼へ' })).toHaveAttribute(
    'href',
    '/password-reset',
  );
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveCount(0);
  await expect(setButton(page)).toHaveCount(0);
});

test('正しくない合言葉：「使えません」の表示。入力欄は出ない。「パスワード再設定の依頼へ」で S-02 に移る', async ({ page }) => {
  await page.goto('/password-set?token=not-a-real-token');
  await expect(page.getByText(UNUSABLE_MESSAGE, { exact: true })).toBeVisible();
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'パスワード再設定の依頼へ' }).click();
  await expect(page).toHaveURL('/password-reset');
  await expect(page.getByRole('heading', { name: 'パスワードの再設定' })).toBeVisible();
});

test('アドレスに token がないときも「使えません」の表示。サーバーを呼ばない', async ({ page }) => {
  let called = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/auth/password-tokens/verify')) {
      called = true;
    }
  });
  await page.goto('/password-set');
  await expect(page.getByText(UNUSABLE_MESSAGE, { exact: true })).toBeVisible();
  expect(called).toBe(false);
});

test('より新しいリンクが送られていると、前のリンクは「使えません」。新しいリンクは使える', async ({ page, request }) => {
  const older = (await issuePasswordLink(request, ADMIN_EMAIL, 'RESET')).token;
  const newer = (await issuePasswordLink(request, ADMIN_EMAIL, 'RESET')).token;

  await page.goto(`/password-set?token=${older}`);
  await expect(page.getByText(UNUSABLE_MESSAGE, { exact: true })).toBeVisible();
  await page.goto(`/password-set?token=${newer}`);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toBeVisible();
});

test('開いただけでは、使用済みにならない（何度開いても使える）', async ({ page, request }) => {
  const token = await openLink(page, request);
  await page.goto(`/password-set?token=${token}`);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toBeVisible();
});

test('開いたあとにリンクが使えなくなった（新しいリンクが送られた）：「設定する」を押すと、「使えません」の表示に変わる', async ({
  page,
  request,
}) => {
  await openLink(page, request);
  await issuePasswordLink(request, ADMIN_EMAIL, 'RESET');
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();
  await expect(page.getByText(UNUSABLE_MESSAGE, { exact: true })).toBeVisible();
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveCount(0);
});

test('Enter でも設定できる', async ({ page, request }) => {
  await openLink(page, request);
  await fillPasswords(page, NEW_PASSWORD);
  await page.getByLabel('新しいパスワード（確認）', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/login');
});

test('「設定する」を2回続けて押しても、決める API は1回だけ呼ぶ', async ({ page, request }) => {
  await openLink(page, request);
  let count = 0;
  await page.route('**/api/auth/password-tokens/use', async (route) => {
    count += 1;
    // 処理中の間に2回目を押せるよう、少し待ってから本物のサーバーに渡す
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).dblclick();
  await expect(page).toHaveURL('/login');
  expect(count).toBe(1);
});

test('処理中は「設定する」を押せない', async ({ page, request }) => {
  await openLink(page, request);
  await page.route('**/api/auth/password-tokens/use', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();
  await expect(setButton(page)).toBeDisabled();
  await expect(page).toHaveURL('/login');
});

test('サーバーが入力の誤り（400）を返したら、入力欄の下にサーバーの文を出す（パスワード・確認）', async ({
  page,
  request,
}) => {
  await openLink(page, request);
  await page.route('**/api/auth/password-tokens/use', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 400,
        message: '入力内容に誤りがあります。',
        data: null,
        errors: [
          { field: 'password', message: 'パスワードは8文字以上で入力してください' },
          { field: 'passwordConfirm', message: '確認用のパスワードが一致しません' },
        ],
      }),
    }),
  );
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();
  await expect(page.getByText('パスワードは8文字以上で入力してください', { exact: true })).toBeVisible();
  await expect(page.getByText('確認用のパスワードが一致しません', { exact: true })).toBeVisible();
});

test('設定の呼び出しが、つながらない・403 のとき：赤の帯に文を出す。入力欄の値は残る', async ({ page, request }) => {
  await openLink(page, request);
  await page.route('**/api/auth/password-tokens/use', (route) => route.abort());
  await fillPasswords(page, NEW_PASSWORD);
  await setButton(page).click();
  await expect(page.getByRole('alert')).toHaveText(SERVER_ERROR_MESSAGE);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveValue(NEW_PASSWORD);

  await page.unroute('**/api/auth/password-tokens/use');
  await page.route('**/api/auth/password-tokens/use', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ status: 403, message: 'この操作を行う権限がありません。', data: null, errors: null }),
    }),
  );
  await setButton(page).click();
  await expect(page.getByRole('alert')).toHaveText('この操作を行う権限がありません。');
});

test('開いたときの確かめが、つながらないとき：赤の帯だけ。入力欄は出ない', async ({ page, request }) => {
  const { token } = await issuePasswordLink(request, ADMIN_EMAIL, 'RESET');
  await page.route('**/api/auth/password-tokens/verify', (route) => route.abort());
  await page.goto(`/password-set?token=${token}`);
  await expect(page.getByRole('alert')).toHaveText(SERVER_ERROR_MESSAGE);
  await expect(page.getByLabel('新しいパスワード', { exact: true })).toHaveCount(0);
});

test('この画面を開いている間だけ、リンクのアドレスが外に伝わらない設定（referrer=no-referrer）が付く', async ({
  page,
  request,
}) => {
  const noReferrer = () => page.locator('meta[name="referrer"][content="no-referrer"]');
  await page.goto('/password-set?token=not-a-real-token');
  await expect(noReferrer()).toHaveCount(1);
  await page.getByRole('link', { name: 'パスワード再設定の依頼へ' }).click();
  await expect(page).toHaveURL('/password-reset');
  await expect(noReferrer()).toHaveCount(0);

  await openLink(page, request);
  await expect(noReferrer()).toHaveCount(1);
});
