// S-13 種別管理の画面のテスト（画面設計 16章、詳細設計 category/S-13_種別管理.md、テスト方針 5章）。
// S-13 はPCだけの画面（画面一覧 7章）なので、メニューのテスト以外はPCの大きさだけで動かす（common.md 11.7）。
// 最初のデータの種別（ID 1〜6。Server の V2）は変えない。テストで作った種別は、各テストのあとで消す。
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from '../support/login';

/** 最初のデータの種別（Server の V2。K-01 が返す順） */
const SEED = [
  { name: 'PC', initial: 'A' },
  { name: 'ヘッドセット', initial: 'B' },
  { name: 'マウス', initial: 'C' },
  { name: 'カメラ', initial: 'D' },
  { name: 'モニター', initial: 'E' },
  { name: 'アダプタ', initial: 'F' },
];
const SEED_MAX_ID = 6;

const IN_USE = 'この種別の備品があるため削除できません';
const CONFLICT = 'ほかの人が先にこの種別を更新しました。画面を開き直して、最新の内容を確かめてください。';

type Category = { id: number; name: string; initial: string | null; equipmentCount: number; version: number };

/** テストの中から、ログイン中の人として API を直接呼ぶ（ほかの人の操作の代わり。画面は通さない） */
async function callApi(page: Page, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown) {
  const token = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  const response = await page.request.fetch(path, {
    method,
    data,
    headers: method === 'GET' ? {} : { 'X-XSRF-TOKEN': decodeURIComponent(token) },
  });
  return { status: response.status(), json: await response.json() };
}

async function listCategories(page: Page): Promise<Category[]> {
  return (await callApi(page, 'GET', '/api/categories')).json.data as Category[];
}

/** 種別の行（名前の列で探す） */
function row(page: Page, name: string) {
  return page.getByTestId('category-row').filter({ has: page.getByRole('cell', { name, exact: true }) });
}

/** 「追加」でダイアログを開き、名前と頭文字を入れて「追加する」を押す */
async function addCategory(page: Page, name: string, initial: string) {
  await page.getByRole('button', { name: '追加', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '種別の追加' });
  await dialog.getByLabel('名前').fill(name);
  await dialog.getByLabel('頭文字').fill(initial);
  await dialog.getByRole('button', { name: '追加する' }).click();
  return dialog;
}

test.describe('S-13 種別管理（PC）', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'pc', 'PCだけの画面（画面一覧 7章）');
    await loginAs(page, 'soumu');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'pc') {
      return;
    }
    // テストで作った種別を消す（最初のデータの種別は残す）
    for (const category of await listCategories(page)) {
      if (category.id > SEED_MAX_ID) {
        await callApi(page, 'DELETE', `/api/categories/${category.id}`);
      }
    }
  });

  test('一覧に、名前・頭文字・使っている備品の数が、頭文字の順に出る', async ({ page }) => {
    await page.goto('/categories');
    await expect(page.getByRole('heading', { name: '種別管理' })).toBeVisible();
    const headers = page.getByTestId('category-table').getByRole('columnheader');
    await expect(headers).toHaveText(['名前', '頭文字', '使っている備品の数', '操作']);
    const rows = page.getByTestId('category-row');
    await expect(rows).toHaveCount(SEED.length);
    for (const [i, seed] of SEED.entries()) {
      await expect(rows.nth(i).getByRole('cell').nth(0)).toHaveText(seed.name);
      await expect(rows.nth(i).getByRole('cell').nth(1)).toHaveText(seed.initial);
      await expect(rows.nth(i).getByRole('cell').nth(2)).toHaveText('0');
      // 使っている備品がなければ、削除を押せる
      await expect(rows.nth(i).getByRole('button', { name: '削除' })).toBeEnabled();
    }
    await expect(page.getByText(IN_USE)).toHaveCount(0);
  });

  test('追加：入力の誤りは、入力欄の下に画面設計の文で出る', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: '追加', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '種別の追加' });
    // 名前が空（空白だけも空とみなす）
    await dialog.getByLabel('名前').fill('   ');
    await dialog.getByLabel('頭文字').fill('12');
    await dialog.getByRole('button', { name: '追加する' }).click();
    await expect(dialog.getByText('名前を入力してください')).toBeVisible();
    await expect(dialog.getByText('頭文字は英字1文字で入力してください')).toBeVisible();
    // 21文字
    await dialog.getByLabel('名前').fill('あ'.repeat(21));
    await dialog.getByLabel('頭文字').fill('');
    await dialog.getByRole('button', { name: '追加する' }).click();
    await expect(dialog.getByText('名前は20文字以内で入力してください')).toBeVisible();
    // 入力欄を変えると、その欄の文は消える
    await dialog.getByLabel('名前').fill('あ'.repeat(20));
    await expect(dialog.getByText('名前は20文字以内で入力してください')).toHaveCount(0);
  });

  test('追加：ほかの種別と重なると、サーバーの文が入力欄の下に出る', async ({ page }) => {
    await page.goto('/categories');
    const dialog = await addCategory(page, 'PC', 'a');
    await expect(dialog.getByText('この名前はすでに使われています')).toBeVisible();
    await expect(dialog.getByText('この頭文字はすでに使われています')).toBeVisible();
    // ダイアログは開いたまま
    await expect(dialog).toBeVisible();
  });

  test('追加：前後の空白を取り除き、頭文字は大文字にして追加し、完了の帯を出す', async ({ page }) => {
    await page.goto('/categories');
    const dialog = await addCategory(page, '  ケーブル  ', ' g ');
    await expect(dialog).toBeHidden();
    await expect(page.getByText('追加しました（ケーブル）')).toBeVisible();
    const added = row(page, 'ケーブル');
    await expect(added.getByRole('cell').nth(1)).toHaveText('G');
    await expect(added.getByRole('cell').nth(2)).toHaveText('0');
    // 頭文字の順に並ぶ（G は F のあと）
    await expect(page.getByTestId('category-row').last()).toContainText('ケーブル');
  });

  test('追加：頭文字がなければ「―」と出て、頭文字のある種別の後ろに並ぶ', async ({ page }) => {
    await page.goto('/categories');
    await addCategory(page, 'テスト種別', '');
    await expect(page.getByText('追加しました（テスト種別）')).toBeVisible();
    await expect(row(page, 'テスト種別').getByRole('cell').nth(1)).toHaveText('―');
    await expect(page.getByTestId('category-row').last()).toContainText('テスト種別');
  });

  test('キャンセル：入力を捨ててダイアログを閉じる', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: '追加', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '種別の追加' });
    await dialog.getByLabel('名前').fill('捨てる種別');
    await dialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('category-row')).toHaveCount(SEED.length);
    // 開き直すと空
    await page.getByRole('button', { name: '追加', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '種別の追加' }).getByLabel('名前')).toHaveValue('');
  });

  test('変更：今の値を入れて開き、保存すると完了の帯を出す', async ({ page }) => {
    await callApi(page, 'POST', '/api/categories', { name: '変える前', initial: 'X' });
    await page.goto('/categories');
    await row(page, '変える前').getByRole('button', { name: '変更' }).click();
    const dialog = page.getByRole('dialog', { name: '種別の変更' });
    await expect(dialog.getByLabel('名前')).toHaveValue('変える前');
    await expect(dialog.getByLabel('頭文字')).toHaveValue('X');
    await dialog.getByLabel('名前').fill('変えた後');
    await dialog.getByLabel('頭文字').fill('');
    await dialog.getByRole('button', { name: '保存する' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('保存しました（変えた後）')).toBeVisible();
    await expect(row(page, '変えた後').getByRole('cell').nth(1)).toHaveText('―');
    await expect(row(page, '変える前')).toHaveCount(0);
  });

  test('変更：ほかの人が先に保存していたら、上書きせずに画面設計の文を赤の帯に出す', async ({ page }) => {
    const created = (await callApi(page, 'POST', '/api/categories', { name: '先に保存', initial: null })).json
      .data as Category;
    await page.goto('/categories');
    await row(page, '先に保存').getByRole('button', { name: '変更' }).click();
    const dialog = page.getByRole('dialog', { name: '種別の変更' });
    // ダイアログを開いている間に、ほかの人が保存した
    await callApi(page, 'PUT', `/api/categories/${created.id}`, {
      name: 'ほかの人の保存',
      initial: null,
      version: created.version,
    });
    await dialog.getByLabel('名前').fill('あとの保存');
    await dialog.getByRole('button', { name: '保存する' }).click();
    await expect(page.getByText(CONFLICT)).toBeVisible();
    await expect(dialog).toBeHidden();
    // 上書きしていない。一覧は読み直されている
    await expect(row(page, 'ほかの人の保存')).toHaveCount(1);
    await expect(row(page, 'あとの保存')).toHaveCount(0);
  });

  test('変更：ほかの人が先に消していたら、「対象が見つかりません。」を赤の帯に出す', async ({ page }) => {
    const created = (await callApi(page, 'POST', '/api/categories', { name: '先に削除', initial: null })).json
      .data as Category;
    await page.goto('/categories');
    await row(page, '先に削除').getByRole('button', { name: '変更' }).click();
    await callApi(page, 'DELETE', `/api/categories/${created.id}`);
    const dialog = page.getByRole('dialog', { name: '種別の変更' });
    await dialog.getByRole('button', { name: '保存する' }).click();
    await expect(page.getByText('対象が見つかりません。')).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(row(page, '先に削除')).toHaveCount(0);
  });

  test('削除：確認のダイアログのあとで削除し、完了の帯を出す。キャンセルなら消さない', async ({ page }) => {
    await callApi(page, 'POST', '/api/categories', { name: '消す種別', initial: null });
    await page.goto('/categories');
    await row(page, '消す種別').getByRole('button', { name: '削除' }).click();
    const confirm = page.getByRole('dialog', { name: '消す種別を削除します。' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'キャンセル' }).click();
    await expect(confirm).toBeHidden();
    await expect(row(page, '消す種別')).toHaveCount(1);

    await row(page, '消す種別').getByRole('button', { name: '削除' }).click();
    await page.getByRole('dialog', { name: '消す種別を削除します。' }).getByRole('button', { name: '削除する' }).click();
    await expect(page.getByText('削除しました（消す種別）')).toBeVisible();
    await expect(row(page, '消す種別')).toHaveCount(0);
  });

  test('削除：使っている備品がある種別は「削除」を押せず、その行に文が出る', async ({ page }) => {
    // 備品を登録する画面・API（C-02）はまだないので、K-01 の答えだけを差し替えて、PC に備品が3つある形にする
    await page.route('**/api/categories', async (route) => {
      if (route.request().method() !== 'GET') {
        return route.fallback();
      }
      const response = await route.fetch();
      const body = await response.json();
      body.data[0].equipmentCount = 3;
      await route.fulfill({ response, json: body });
    });
    await page.goto('/categories');
    const pc = row(page, 'PC');
    await expect(pc.getByRole('cell').nth(2)).toHaveText('3');
    await expect(pc.getByRole('button', { name: '削除' })).toBeDisabled();
    await expect(pc.getByText(IN_USE)).toBeVisible();
    // 備品のない種別は押せて、文も出ない
    await expect(row(page, 'マウス').getByRole('button', { name: '削除' })).toBeEnabled();
    await expect(page.getByText(IN_USE)).toHaveCount(1);
  });

  test('削除：押したあとで備品を足されていたら、サーバーの文を赤の帯に出す', async ({ page }) => {
    const created = (await callApi(page, 'POST', '/api/categories', { name: '直前に使われた', initial: null }))
      .json.data as Category;
    // 備品を足す API（C-02）はまだないので、K-04 の答えだけを差し替える（K-04 の9章 No.2 の 400 と同じ形）
    await page.route(`**/api/categories/${created.id}`, (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({
            status: 400,
            json: { status: 400, message: IN_USE, data: null, errors: null },
          })
        : route.fallback(),
    );
    await page.goto('/categories');
    await row(page, '直前に使われた').getByRole('button', { name: '削除' }).click();
    const confirm = page.getByRole('dialog', { name: '直前に使われたを削除します。' });
    await confirm.getByRole('button', { name: '削除する' }).click();
    await expect(page.getByRole('alert').filter({ hasText: IN_USE })).toBeVisible();
    await expect(confirm).toBeHidden();
    await expect(row(page, '直前に使われた')).toHaveCount(1);
  });
});

test.describe('S-13 種別管理：権限とメニュー', () => {
  test('「種別を管理する」を持つ人のメニューに「種別管理」が出て、押すと開く', async ({ page }, testInfo) => {
    await loginAs(page, 'soumu');
    if (testInfo.project.name === 'smartphone') {
      // スマートフォンは「≡」で開く
      await expect(page.getByTestId('header-menu')).toBeHidden();
      await page.getByRole('button', { name: 'メニュー' }).click();
      await page.getByRole('menuitem', { name: '種別管理' }).click();
    } else {
      // PCは横に並ぶ
      await expect(page.getByRole('button', { name: 'メニュー' })).toBeHidden();
      await page.getByTestId('header-menu').getByRole('link', { name: '種別管理' }).click();
    }
    await expect(page).toHaveURL('/categories');
    await expect(page.getByRole('heading', { name: '種別管理' })).toBeVisible();
  });

  test('持たない人には、メニューに出ず、開くと権限がない文と「最初の画面へ」が出る', async ({ page }) => {
    await loginAs(page, 'ippan');
    // 開ける画面がないので、「≡」も「種別管理」も出ない
    await expect(page.getByRole('button', { name: 'メニュー' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '種別管理' })).toHaveCount(0);

    let listed = false;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/categories')) {
        listed = true;
      }
    });
    await page.goto('/categories');
    await expect(page.getByTestId('error-page')).toHaveText('このページを見る権限がありません。');
    await expect(page.getByTestId('category-table')).toHaveCount(0);
    // 一覧（K-01）は読まない
    expect(listed).toBe(false);
    await page.getByRole('link', { name: '最初の画面へ' }).click();
    await expect(page).toHaveURL('/');
  });
});
