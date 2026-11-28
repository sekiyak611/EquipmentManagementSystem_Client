// S-04 パスワード変更（画面設計 1.1・1.2・7章・8章、詳細設計 auth/S-04_パスワード変更.md）
// 本物のサーバーを使う。パスワードを変える・ロックするテストは、ほかのテスト（開発用のユーザでログイン）に影響しないよう、
// 終わったあとに、開発用のパスワードに戻す（restoreDevPassword）。
import { expect, test, type Page } from '@playwright/test';
import { DEV_PASSWORD, DEV_USERS, fillAndLogin, loginAs } from '../support/login';
import { restoreDevPassword } from '../support/passwordLink';
import { clearSlackMessages, getSlackMessages } from '../support/slack';

const NEW_PASSWORD = 'Xq7#kd9!Lm2';
const WRONG_CURRENT = '現在のパスワードが違います';
const SERVER_ERROR_MESSAGE =
  '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。';

/** このテストで、パスワードを変えた・ロックした開発用のユーザ（終わったら、もとに戻す） */
const touched = new Set<'soumu' | 'ippan'>();

test.afterEach(async ({ request }) => {
  for (const user of touched) {
    await restoreDevPassword(request, DEV_USERS[user].email);
  }
  touched.clear();
});

const currentField = (page: Page) => page.getByLabel('現在のパスワード', { exact: true });
const newField = (page: Page) => page.getByLabel('新しいパスワード', { exact: true });
const confirmField = (page: Page) => page.getByLabel('新しいパスワード（確認）', { exact: true });
const changeButton = (page: Page) => page.getByRole('button', { name: '変更する', exact: true });

async function fillAll(page: Page, current: string, password: string, confirm: string = password): Promise<void> {
  await currentField(page).fill(current);
  await newField(page).fill(password);
  await confirmField(page).fill(confirm);
}

/** ログインして、S-04 を開く（アドレスを直接開く） */
async function openChangePage(page: Page, user: 'soumu' | 'ippan' = 'ippan'): Promise<void> {
  await loginAs(page, user);
  await page.goto('/password-change');
  await expect(page.getByRole('heading', { name: 'パスワード変更' })).toBeVisible();
}

test('ヘッダーの氏名を押すと「パスワード変更」と「ログアウト」（この順）が出る。「パスワード変更」で S-04 に移る', async ({
  page,
}) => {
  await loginAs(page, 'ippan');
  await page.getByTestId('header-user').click();
  await expect(page.getByRole('menuitem')).toHaveText(['パスワード変更', 'ログアウト']);
  await page.getByRole('menuitem', { name: 'パスワード変更' }).click();
  await expect(page).toHaveURL('/password-change');
  await expect(page.getByRole('heading', { name: 'パスワード変更' })).toBeVisible();
  // ログイン中なので、ヘッダーに氏名が出る
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.ippan.name);
});

test('画面設計の項目と文が出ている（3つの入力欄、決まり、「変更する」）', async ({ page }) => {
  await openChangePage(page);
  for (const field of [currentField(page), newField(page), confirmField(page)]) {
    await expect(field).toHaveAttribute('type', 'password');
    await expect(field).toHaveValue('');
  }
  await expect(page.getByText('・8文字以上、64文字以内', { exact: true })).toBeVisible();
  await expect(page.getByText('・使える文字：半角の英字・数字・記号・スペース', { exact: true })).toBeVisible();
  await expect(changeButton(page)).toBeEnabled();
});

test('入力欄は、現在のパスワード（current-password）・新しいパスワード（new-password）用', async ({ page }) => {
  await openChangePage(page);
  await expect(currentField(page)).toHaveAttribute('autocomplete', 'current-password');
  await expect(newField(page)).toHaveAttribute('autocomplete', 'new-password');
  await expect(confirmField(page)).toHaveAttribute('autocomplete', 'new-password');
});

test('横にスクロールしない（スマートフォンの幅でも）', async ({ page }) => {
  await openChangePage(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('ログインせずに開くと、ログイン画面に移る。ログインすると、この画面に戻る', async ({ page }) => {
  await page.goto('/password-change');
  await expect(page).toHaveURL('/login?redirect=%2Fpassword-change');
  await fillAndLogin(page, DEV_USERS.ippan.email, DEV_PASSWORD);
  await expect(page).toHaveURL('/password-change');
  await expect(page.getByRole('heading', { name: 'パスワード変更' })).toBeVisible();
});

test('目のマークを押すと、その欄の文字が出て、もう一度押すと伏せ字に戻る', async ({ page }) => {
  await openChangePage(page);
  await fillAll(page, 'abc', 'def');
  await page.getByRole('button', { name: 'パスワードを表示する' }).first().click();
  await expect(currentField(page)).toHaveAttribute('type', 'text');
  await expect(newField(page)).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'パスワードを隠す' }).click();
  await expect(currentField(page)).toHaveAttribute('type', 'password');
});

test('入力中に、決まりの前が「・」から「✓」に変わる（新しいパスワード）', async ({ page }) => {
  await openChangePage(page);
  const length = (mark: string) => page.getByText(`${mark}8文字以上、64文字以内`, { exact: true });
  const chars = (mark: string) => page.getByText(`${mark}使える文字：半角の英字・数字・記号・スペース`, { exact: true });
  await expect(length('・')).toBeVisible();
  await newField(page).fill('abcdefgh');
  await expect(length('✓')).toBeVisible();
  await expect(chars('✓')).toBeVisible();
  await newField(page).fill('パスワードパスワード');
  await expect(length('✓')).toBeVisible();
  await expect(chars('・')).toBeVisible();
  // 現在のパスワードの入力では、変わらない
  await newField(page).fill('');
  await currentField(page).fill('abcdefgh');
  await expect(length('・')).toBeVisible();
});

test('空のまま押すと、「現在のパスワードを入力してください」と「新しいパスワードを入力してください」。サーバーを呼ばない', async ({
  page,
}) => {
  await openChangePage(page);
  let called = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/me/password')) {
      called = true;
    }
  });
  await changeButton(page).click();
  await expect(page.getByText('現在のパスワードを入力してください', { exact: true })).toBeVisible();
  await expect(page.getByText('新しいパスワードを入力してください', { exact: true })).toBeVisible();
  await expect(page.getByText('確認用のパスワードが一致しません', { exact: true })).toHaveCount(0);
  expect(called).toBe(false);
});

test('新しいパスワードが現在と同じ：「現在と同じパスワードは使えません」。サーバーを呼ばない。現在のパスワードが空のときは、この文は出ない', async ({
  page,
}) => {
  await openChangePage(page);
  let called = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/me/password')) {
      called = true;
    }
  });
  await fillAll(page, DEV_PASSWORD, DEV_PASSWORD);
  await changeButton(page).click();
  await expect(page.getByText('現在と同じパスワードは使えません', { exact: true })).toBeVisible();

  await currentField(page).fill('');
  await changeButton(page).click();
  await expect(page.getByText('現在と同じパスワードは使えません', { exact: true })).toHaveCount(0);
  await expect(page.getByText('現在のパスワードを入力してください', { exact: true })).toBeVisible();
  expect(called).toBe(false);
});

test('新しいパスワードが短い・長い・使えない文字：1つの欄に、画面設計 8章の文を1つだけ出す。サーバーを呼ばない', async ({
  page,
}) => {
  await openChangePage(page);
  let called = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/me/password')) {
      called = true;
    }
  });
  const cases: Array<[string, string]> = [
    ['Xq7#kd9', 'パスワードは8文字以上で入力してください'],
    ['Xq7#kd9!'.repeat(8) + 'a', 'パスワードは64文字以内で入力してください'],
    ['パスワードパスワード', 'パスワードに使えるのは、半角の英字・数字・記号・スペースです'],
  ];
  for (const [password, expected] of cases) {
    await fillAll(page, DEV_PASSWORD, password);
    await changeButton(page).click();
    await expect(page.getByText(expected, { exact: true })).toBeVisible();
  }
  expect(called).toBe(false);
});

test('確認が違うと、確認の欄の下に「確認用のパスワードが一致しません」', async ({ page }) => {
  await openChangePage(page);
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD, `${NEW_PASSWORD}x`);
  await changeButton(page).click();
  await expect(page.getByText('確認用のパスワードが一致しません', { exact: true })).toBeVisible();
});

test('現在のパスワードが違う：現在のパスワードの欄の下に「現在のパスワードが違います」。この画面のまま、ログインしたまま。入力欄の値は残る', async ({
  page,
}) => {
  touched.add('ippan');
  await openChangePage(page);
  await fillAll(page, 'wrong-password', NEW_PASSWORD);
  await changeButton(page).click();
  await expect(page.getByText(WRONG_CURRENT, { exact: true })).toBeVisible();
  await expect(page).toHaveURL('/password-change');
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.ippan.name);
  await expect(currentField(page)).toHaveValue('wrong-password');
  await expect(newField(page)).toHaveValue(NEW_PASSWORD);
});

test('よく使われるパスワードは、サーバーが断る：新しいパスワードの欄の下に画面設計 8章の文。パスワードは変わらない', async ({
  page,
}) => {
  await openChangePage(page);
  await fillAll(page, DEV_PASSWORD, 'qwertyuiop');
  await changeButton(page).click();
  await expect(
    page.getByText('このパスワードはよく使われているため、使えません。別のパスワードにしてください', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/password-change');
});

test('変更できると、この画面を開く前の画面（種別管理）に戻り、緑の帯「パスワードを変更しました」が出る。ログインしたまま。本人にDM（④）が届く。新しいパスワードでログインできる', async ({
  page,
  request,
}) => {
  touched.add('soumu');
  await clearSlackMessages(request);
  await loginAs(page, 'soumu');
  // 種別管理（/categories）を開いてから、画面の中の操作（氏名のメニュー）で S-04 を開く（開く前の画面に戻れるように）
  await page.goto('/categories');
  await expect(page.getByRole('heading', { name: '種別管理' })).toBeVisible();
  await page.getByTestId('header-user').click();
  await page.getByRole('menuitem', { name: 'パスワード変更' }).click();
  await expect(page).toHaveURL('/password-change');

  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).click();

  await expect(page).toHaveURL('/categories');
  await expect(page.getByRole('status')).toHaveText('パスワードを変更しました');
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.soumu.name);

  const messages = (await getSlackMessages(request)).filter((m) => m.email === DEV_USERS.soumu.email);
  expect(messages).toHaveLength(1);
  expect(messages[0].title).toBe('【備品管理】パスワードを変更しました');
  expect(messages[0].body).not.toContain(NEW_PASSWORD);

  // ログインしたままなので、続けて操作できる。ログアウトして、新しいパスワードでログインし直せる
  await page.getByTestId('header-user').click();
  await page.getByRole('menuitem', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL('/login');
  await fillAndLogin(page, DEV_USERS.soumu.email, NEW_PASSWORD);
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.soumu.name);
});

test('この画面を直接開いて変更したときは、最初の画面（/）に移る', async ({ page }) => {
  touched.add('ippan');
  await openChangePage(page, 'ippan');
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).click();
  await expect(page).toHaveURL('/my-equipment');
  await expect(page.getByRole('status')).toHaveText('パスワードを変更しました');
  await expect(page.getByTestId('header-user')).toHaveText(DEV_USERS.ippan.name);
});

test('Enter でも変更できる', async ({ page }) => {
  touched.add('ippan');
  await openChangePage(page);
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await confirmField(page).press('Enter');
  await expect(page).toHaveURL('/my-equipment');
});

test('「変更する」を2回続けて押しても、変更の API は1回だけ呼ぶ', async ({ page }) => {
  touched.add('ippan');
  await openChangePage(page);
  let count = 0;
  await page.route('**/api/me/password', async (route) => {
    count += 1;
    // 処理中の間に2回目を押せるよう、少し待ってから本物のサーバーに渡す
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).dblclick();
  await expect(page).toHaveURL('/my-equipment');
  expect(count).toBe(1);
});

test('処理中は「変更する」を押せない', async ({ page }) => {
  touched.add('ippan');
  await openChangePage(page);
  await page.route('**/api/me/password', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).click();
  await expect(changeButton(page)).toBeDisabled();
  await expect(page).toHaveURL('/my-equipment');
});

test('サーバーが入力の誤り（400）を返したら、入力欄の下にサーバーの文を出す（3つの欄）', async ({ page }) => {
  await openChangePage(page);
  await page.route('**/api/me/password', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 400,
        message: '入力内容に誤りがあります。',
        data: null,
        errors: [
          { field: 'currentPassword', message: '現在のパスワードが違います' },
          { field: 'password', message: 'パスワードは8文字以上で入力してください' },
          { field: 'passwordConfirm', message: '確認用のパスワードが一致しません' },
        ],
      }),
    }),
  );
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).click();
  await expect(page.getByText('現在のパスワードが違います', { exact: true })).toBeVisible();
  await expect(page.getByText('パスワードは8文字以上で入力してください', { exact: true })).toBeVisible();
  await expect(page.getByText('確認用のパスワードが一致しません', { exact: true })).toBeVisible();
});

test('つながらない・403 のとき：赤の帯に文を出す。入力欄の値は残る', async ({ page }) => {
  await openChangePage(page);
  await page.route('**/api/me/password', (route) => route.abort());
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).click();
  await expect(page.getByRole('alert')).toHaveText(SERVER_ERROR_MESSAGE);
  await expect(newField(page)).toHaveValue(NEW_PASSWORD);

  await page.unroute('**/api/me/password');
  await page.route('**/api/me/password', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ status: 403, message: 'この操作を行う権限がありません。', data: null, errors: null }),
    }),
  );
  await changeButton(page).click();
  await expect(page.getByRole('alert')).toHaveText('この操作を行う権限がありません。');
});

test('ログインが切れていた（401）：ログイン画面に移る。ログインしたら、この画面に戻る', async ({ page }) => {
  await openChangePage(page);
  await page.route('**/api/me/password', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ status: 401, message: 'ログインしてください。', data: null, errors: null }),
    }),
  );
  await fillAll(page, DEV_PASSWORD, NEW_PASSWORD);
  await changeButton(page).click();
  await expect(page).toHaveURL('/login?redirect=%2Fpassword-change');
});

test('現在のパスワードを5回続けて間違えると、5回目も同じ「現在のパスワードが違います」。ロックされ、本人にDM（③）が届く。この端末はログアウトし、次の操作でログイン画面に移る', async ({
  page,
  request,
}) => {
  touched.add('ippan');
  await clearSlackMessages(request);
  await openChangePage(page, 'ippan');
  for (let i = 1; i <= 5; i++) {
    await fillAll(page, 'wrong-password', NEW_PASSWORD);
    await changeButton(page).click();
    await expect(page.getByText(WRONG_CURRENT, { exact: true })).toBeVisible();
    // 同じ文が続けて出るので、一度消してから次へ（5回目まで、同じ画面・同じ文）
    if (i < 5) {
      await currentField(page).fill('');
    }
  }
  const lockDms = (await getSlackMessages(request)).filter(
    (m) => m.email === DEV_USERS.ippan.email && m.title === '【備品管理】アカウントをロックしました',
  );
  expect(lockDms).toHaveLength(1);

  // この端末はログアウトしている：次にサーバーを呼ぶ操作（画面を開き直す）で、ログイン画面に移る
  await page.reload();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  // ロックされているので、正しいパスワードでもログインできない
  await fillAndLogin(page, DEV_USERS.ippan.email, DEV_PASSWORD);
  await expect(page.getByRole('alert')).toHaveText('メールアドレスまたはパスワードが違います');
});
