// S-05 自分の備品の画面のテスト（画面設計 3章、詳細設計 equipment/mine/S-05_自分の備品.md、テスト方針 5章）。
// S-05 はスマートフォン優先の画面（画面一覧 7章）なので、スマートフォンと PC の両方の大きさで動かす。
// 借りている備品を作る API が、まだない（S-06・総務の貸出の API は、これから）。そのため、一覧・確認・返却の API（B-01・B-03・B-04）の
// 返事は、page.route で差し替える（2026-11-25 に人が決めた）。画面からの送り方（送る値）は、差し替えた API が受け取った値で確かめる。
// 一覧が空のとき・メニュー・権限は、本物の Server と、本物のログインで確かめる。Server との本物のつながりは、API のテストとシナリオテストで確かめる。
import { expect, test, type Page, type Route } from '@playwright/test';
import { loginAs } from '../../support/login';

type Item = {
  loanId: number;
  equipmentId: number;
  managementNo: string;
  categoryName: string;
  maker: string | null;
  model: string | null;
  lentOn: string;
  dueOn: string | null;
  overdue: boolean;
  lastConfirmedOn: string | null;
  confirmedThisMonth: boolean;
};
type MyLoans = { unconfirmedCount: number; reminderAt: string; reminderPassed: boolean; items: Item[] };
type Reply = { status: number; message: string; errors?: { field: string | null; message: string }[] };

const REMINDER_AT = '2026-11-25T09:00:00+09:00';
const SYSTEM_ERROR = '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。';

function item(n: number, overrides: Partial<Item> = {}): Item {
  return {
    loanId: 100 + n,
    equipmentId: 200 + n,
    managementNo: `A00${n}`,
    categoryName: 'PC',
    maker: 'Lenovo',
    model: `ThinkPad X${n}`,
    lentOn: '2026-10-01',
    dueOn: null,
    overdue: false,
    lastConfirmedOn: '2026-10-20',
    confirmedThisMonth: false,
    ...overrides,
  };
}

/** 一覧の形に直す（未確認の数を数え直す） */
function listOf(items: Item[], reminderPassed = false): MyLoans {
  return {
    unconfirmedCount: items.filter((i) => !i.confirmedThisMonth).length,
    reminderAt: REMINDER_AT,
    reminderPassed,
    items,
  };
}

/** 差し替えた API の状態。テストが、返事・遅れ・エラーを入れ替える */
type Mock = {
  list: MyLoans;
  gets: number;
  /** 画面を開いた直後の B-01 の呼ばれた回数（開発用の画面は、最初に2回呼ぶことがある。そのあとの増えた分で確かめる） */
  initialGets: number;
  confirmBodies: { equipmentIds: number[] }[];
  returnCalls: { loanId: number; body: { memo: string | null } }[];
  getReply: Reply | null;
  confirmReply: Reply | null;
  returnReply: Reply | null;
  /** 入れると、その Promise が終わるまで返事を出さない（テストが release で返事を出す） */
  getGate: Promise<void> | null;
  confirmGate: Promise<void> | null;
  returnGate: Promise<void> | null;
  /** true なら、確認の送信がつながらない */
  networkDown: boolean;
};

const ok = (data: unknown) => ({ status: 200, message: '', data, errors: null });
const fail = (reply: Reply) => ({ status: reply.status, message: reply.message, data: null, errors: reply.errors ?? null });

function respond(route: Route, reply: Reply | null, data: unknown) {
  const body = reply ? fail(reply) : ok(data);
  return route.fulfill({
    status: reply ? reply.status : 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** テストが返事を出す時を決めるための、手で開ける門 */
function gate(): { promise: Promise<void>; release: () => void } {
  let release: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function mockMine(page: Page, items: Item[], reminderPassed = false): Promise<Mock> {
  const mock: Mock = {
    list: listOf(items, reminderPassed),
    gets: 0,
    initialGets: 0,
    confirmBodies: [],
    returnCalls: [],
    getReply: null,
    confirmReply: null,
    returnReply: null,
    getGate: null,
    confirmGate: null,
    returnGate: null,
    networkDown: false,
  };
  await page.route('**/api/me/loans', async (route) => {
    mock.gets += 1;
    await mock.getGate;
    await respond(route, mock.getReply, mock.list);
  });
  await page.route('**/api/me/confirmations', async (route) => {
    const body = route.request().postDataJSON() as { equipmentIds: number[] };
    mock.confirmBodies.push(body);
    if (mock.networkDown) {
      await route.abort('failed');
      return;
    }
    await mock.confirmGate;
    if (!mock.confirmReply) {
      mock.list = listOf(
        mock.list.items.map((i) => (body.equipmentIds.includes(i.equipmentId) ? { ...i, confirmedThisMonth: true } : i)),
        mock.list.reminderPassed,
      );
    }
    await respond(route, mock.confirmReply, mock.list);
  });
  await page.route('**/api/me/loans/*/return', async (route) => {
    const loanId = Number(/loans\/(\d+)\/return/.exec(route.request().url())?.[1]);
    mock.returnCalls.push({ loanId, body: route.request().postDataJSON() as { memo: string | null } });
    await mock.returnGate;
    if (!mock.returnReply) {
      mock.list = listOf(
        mock.list.items.filter((i) => i.loanId !== loanId),
        mock.list.reminderPassed,
      );
    }
    await respond(route, mock.returnReply, mock.list);
  });
  return mock;
}

/** ログインしてから、差し替えた API で S-05 を開く */
async function openMine(page: Page, items: Item[], options: { reminderPassed?: boolean } = {}): Promise<Mock> {
  await loginAs(page, 'ippan');
  const mock = await mockMine(page, items, options.reminderPassed);
  await page.goto('/my-equipment');
  await expect(page.getByRole('heading', { name: '自分の備品' })).toBeVisible();
  await expect(page.getByTestId('my-equipment-card')).not.toHaveCount(0);
  mock.initialGets = mock.gets;
  return mock;
}

function card(page: Page, managementNo: string) {
  return page.getByTestId('my-equipment-card').filter({ hasText: managementNo });
}

const bar = (page: Page) => page.getByTestId('message-bar');

/** 完了の緑の帯（role=status）に、その文が出ている */
async function expectSuccess(page: Page, text: string) {
  await expect(bar(page)).toHaveText(text);
  await expect(bar(page)).toHaveAttribute('role', 'status');
}

/** 操作できなかった赤の帯（role=alert）に、その文が出ている */
async function expectError(page: Page, text: string) {
  await expect(bar(page)).toHaveText(text);
  await expect(bar(page)).toHaveAttribute('role', 'alert');
}

/** 日本時間の今日を「2026/11/25」の形で（画面の「返却日」の確かめに使う） */
function todayInJapan(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date()).replaceAll('-', '/');
}

test.describe('S-05 自分の備品：表示', () => {
  test('借りている備品がなければ、「借りている備品はありません。」と「＋ 備品を借りる」だけが出る（本物の Server）', async ({ page }) => {
    await loginAs(page, 'ippan');
    await page.goto('/my-equipment');
    await expect(page.getByTestId('my-equipment-empty')).toHaveText('借りている備品はありません。');
    await expect(page.getByRole('button', { name: '＋ 備品を借りる' })).toBeVisible();
    await expect(page.getByTestId('my-equipment-notice')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /まとめて確認した/ })).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(0);
  });

  test('催促の日時の前：未確認の件数と「11/25（水）9:00 までに確認してください。」が出て、まとめてのボタンに件数が出る', async ({ page }) => {
    await openMine(page, [item(1), item(2), item(3, { confirmedThisMonth: true })]);
    const notice = page.getByTestId('my-equipment-notice');
    await expect(notice).toContainText('今月まだ確認していない備品が 2件 あります。');
    await expect(notice).toContainText('11/25（水）9:00 までに確認してください。');
    await expect(page.getByRole('button', { name: 'まとめて確認した（2件）' })).toBeVisible();
  });

  test('催促の日時を過ぎたら、「あります。確認してください。」と出る', async ({ page }) => {
    await openMine(page, [item(1)], { reminderPassed: true });
    await expect(page.getByTestId('my-equipment-notice')).toHaveText(
      '今月まだ確認していない備品が 1件 あります。確認してください。',
    );
  });

  test('すべて確認済みなら、「今月の確認はすべて済んでいます。」が出て、まとめてのボタンは出ない。「確認済み」は押せない', async ({ page }) => {
    await openMine(page, [item(1, { confirmedThisMonth: true })]);
    await expect(page.getByTestId('my-equipment-notice')).toHaveText('今月の確認はすべて済んでいます。');
    await expect(page.getByRole('button', { name: /まとめて確認した/ })).toHaveCount(0);
    await expect(card(page, 'A001').getByRole('button', { name: '確認済み' })).toBeDisabled();
    await expect(card(page, 'A001').getByRole('button', { name: '確認した', exact: true })).toHaveCount(0);
  });

  test('備品1件：管理番号・種別・メーカー・モデル・日付・状態が出る。返却予定日がなければ「―」。並びは API が返した順のまま', async ({ page }) => {
    await openMine(page, [
      item(1, { lastConfirmedOn: null }),
      item(2, { confirmedThisMonth: true, dueOn: '2026-11-30', lastConfirmedOn: '2026-11-02', lentOn: '2026-11-02' }),
    ]);
    const first = card(page, 'A001');
    await expect(first).toContainText('A001　PC');
    await expect(first).toContainText('Lenovo ThinkPad X1');
    await expect(first).toContainText('貸出日 2026/10/01');
    await expect(first).toContainText('返却予定日 ―');
    await expect(first).toContainText('最終確認日 ―');
    await expect(first).toContainText('未確認');
    await expect(first.getByRole('button', { name: '確認した', exact: true })).toBeVisible();
    await expect(first.getByRole('button', { name: '返す' })).toBeVisible();

    const second = card(page, 'A002');
    await expect(second).toContainText('貸出日 2026/11/02');
    await expect(second).toContainText('返却予定日 2026/11/30');
    await expect(second).toContainText('最終確認日 2026/11/02');
    await expect(second).toContainText('確認済み');
    const cards = page.getByTestId('my-equipment-card');
    await expect(cards.nth(0)).toContainText('A001');
    await expect(cards.nth(1)).toContainText('A002');
  });

  test('返却予定日を過ぎた備品は、返却予定日が赤字になる（過ぎていない備品は赤字でない）', async ({ page }) => {
    await openMine(page, [item(1, { dueOn: '2026-11-20', overdue: true }), item(2, { dueOn: '2026-12-20' })]);
    const rgb = async (managementNo: string) => {
      const color = await card(page, managementNo)
        .getByText(/返却予定日 20/)
        .evaluate((el) => getComputedStyle(el).color);
      return (/rgba?\((\d+), (\d+), (\d+)/.exec(color) ?? []).slice(1).map(Number);
    };
    const [r, g, b] = await rgb('A001');
    // 赤：赤の成分が強く、緑・青が弱い
    expect(r).toBeGreaterThan(150);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(100);
    const normal = await rgb('A002');
    expect(normal).not.toEqual([r, g, b]);
  });
  test('メーカーとモデルがなければ、その行を出さない。片方だけなら、その方だけを出す', async ({ page }) => {
    await openMine(page, [item(1, { maker: null, model: null }), item(2, { maker: null }), item(3, { model: null })]);
    await expect(card(page, 'A001')).not.toContainText('ThinkPad');
    // メーカー・モデルの行がないので、段落は「貸出日…」と「最終確認日…」の2つだけ（ある備品は3つ）
    await expect(card(page, 'A001').locator('p')).toHaveCount(2);
    await expect(card(page, 'A002').locator('p')).toHaveCount(3);
    await expect(card(page, 'A002').getByText('ThinkPad X2', { exact: true })).toBeVisible();
    await expect(card(page, 'A003').getByText('Lenovo', { exact: true })).toBeVisible();
  });

  test('長い管理番号・モデル名でも、画面が横にスクロールしない', async ({ page }) => {
    await openMine(page, [item(1, { managementNo: 'A'.repeat(60), model: 'X'.repeat(90) })]);
    await expect(page.getByTestId('my-equipment-card')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('「＋ 備品を借りる」を押すと /borrow に移る', async ({ page }) => {
    await openMine(page, [item(1)]);
    await page.getByRole('button', { name: '＋ 備品を借りる' }).click();
    // S-06（ZPOP-108）ができるまでは、移った先に「ページが見つかりません。」が出る。移る先のアドレスだけを確かめる
    await expect(page).toHaveURL('/borrow');
  });
  test('並びは API が返した順のまま、画面では並べ直さない（確認済みが先でも、貸出日が新しい順でも、そのまま）', async ({ page }) => {
    await openMine(page, [
      item(3, { confirmedThisMonth: true, lentOn: '2026-11-10' }),
      item(1, { lentOn: '2026-10-01' }),
      item(2, { lentOn: '2026-11-20' }),
    ]);
    const cards = page.getByTestId('my-equipment-card');
    await expect(cards.nth(0)).toContainText('A003');
    await expect(cards.nth(1)).toContainText('A001');
    await expect(cards.nth(2)).toContainText('A002');
  });

  test('催促の日時の形：月・日は0を付けず、時刻は H:mm（12/4（金）9:30）', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    mock.list = { ...mock.list, reminderAt: '2026-12-04T09:30:00+09:00' };
    await page.reload();
    await expect(page.getByTestId('my-equipment-notice')).toContainText('12/4（金）9:30 までに確認してください。');
  });

  test('スマートフォンでは「まとめて確認した」「＋ 備品を借りる」が横いっぱいで、PC では並べ方が違う。ボタンの高さは44px以上', async ({ page }, testInfo) => {
    await openMine(page, [item(1)]);
    const viewport = page.viewportSize();
    const bulk = await page.getByRole('button', { name: 'まとめて確認した（1件）' }).boundingBox();
    const borrow = await page.getByRole('button', { name: '＋ 備品を借りる' }).boundingBox();
    const confirmButton = await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).boundingBox();
    expect(bulk && borrow && confirmButton && viewport).toBeTruthy();
    expect(bulk!.height).toBeGreaterThanOrEqual(44);
    expect(borrow!.height).toBeGreaterThanOrEqual(44);
    expect(confirmButton!.height).toBeGreaterThanOrEqual(44);
    if (testInfo.project.name === 'smartphone') {
      expect(bulk!.width).toBeGreaterThan(viewport!.width * 0.8);
      expect(borrow!.width).toBeGreaterThan(viewport!.width * 0.8);
    } else {
      expect(bulk!.width).toBeLessThan(400);
      expect(borrow!.width).toBeLessThan(400);
    }
  });

  test('「確認済み」は緑、「未確認」は黄。案内は、未確認があれば黄、すべて済んでいれば緑', async ({ page }) => {
    await openMine(page, [item(1), item(2, { confirmedThisMonth: true })]);
    await expect(card(page, 'A001').locator('.MuiChip-colorWarning')).toHaveText('未確認');
    await expect(card(page, 'A002').locator('.MuiChip-colorSuccess')).toHaveText('確認済み');
    await expect(page.getByTestId('my-equipment-notice')).toHaveClass(/MuiAlert-colorWarning/);
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expect(page.getByTestId('my-equipment-notice')).toHaveClass(/MuiAlert-colorSuccess/);
  });
});

test.describe('S-05 自分の備品：確認した', () => {
  test('「確認した」：確認のダイアログは出ず、その備品の ID だけを送り、「確認しました（A001）」が出て、一覧が変わる', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectSuccess(page, '確認しました（A001）');
    expect(mock.confirmBodies).toEqual([{ equipmentIds: [201] }]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card(page, 'A001').getByRole('button', { name: '確認済み' })).toBeDisabled();
    await expect(card(page, 'A001')).toContainText('確認済み');
    await expect(page.getByRole('button', { name: 'まとめて確認した（1件）' })).toBeVisible();
    // 成功したあとは、一覧を読み直さない（返ってきた最新の一覧を使う）
    expect(mock.gets).toBe(mock.initialGets);
  });

  test('「まとめて確認した」：確認のダイアログ。「キャンセル」なら何も送らない', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2), item(3, { confirmedThisMonth: true })]);
    await page.getByRole('button', { name: 'まとめて確認した（2件）' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('2件の備品を確認済みにします。手元にあることを確かめましたか？');
    await dialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(dialog).toHaveCount(0);
    expect(mock.confirmBodies).toEqual([]);
  });

  test('「まとめて確認した」：確認すると、未確認の備品すべての ID を送り、「2件の備品を確認しました」が出る', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2), item(3, { confirmedThisMonth: true })]);
    await page.getByRole('button', { name: 'まとめて確認した（2件）' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '確認した', exact: true }).click();
    await expectSuccess(page, '2件の備品を確認しました');
    expect(mock.confirmBodies).toEqual([{ equipmentIds: [201, 202] }]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-notice')).toHaveText('今月の確認はすべて済んでいます。');
    await expect(page.getByRole('button', { name: /まとめて確認した/ })).toHaveCount(0);
  });

  test('二重押し：送っている間は、一覧のすべての操作ボタンが押せず、押し直しても送らない。終わると押せる', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    const g = gate();
    mock.confirmGate = g.promise;
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expect(card(page, 'A001').getByRole('button', { name: '確認した', exact: true })).toBeDisabled();
    await expect(card(page, 'A002').getByRole('button', { name: '確認した', exact: true })).toBeDisabled();
    await expect(card(page, 'A002').getByRole('button', { name: '返す' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /まとめて確認した/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: '＋ 備品を借りる' })).toBeDisabled();
    // 送っている間に押し直しても、送らない
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click({ force: true });
    g.release();
    await expectSuccess(page, '確認しました（A001）');
    expect(mock.confirmBodies).toHaveLength(1);
    await expect(card(page, 'A002').getByRole('button', { name: '返す' })).toBeEnabled();
    await expect(page.getByRole('button', { name: '＋ 備品を借りる' })).toBeEnabled();
  });

  test('「まとめて確認した」の確認のダイアログ：送っている間は実行ボタンが押せない。窓の外・Esc でも閉じられ、何も送らない', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    await page.getByRole('button', { name: 'まとめて確認した（2件）' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(mock.confirmBodies).toEqual([]);

    const g = gate();
    mock.confirmGate = g.promise;
    await page.getByRole('button', { name: 'まとめて確認した（2件）' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '確認した', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '確認した', exact: true })).toBeDisabled();
    g.release();
    await expectSuccess(page, '2件の備品を確認しました');
    await expect(dialog).toHaveCount(0);
    expect(mock.confirmBodies).toHaveLength(1);
  });

  test('帯：次の操作を始めると、前の帯（赤）が消える', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 500, message: SYSTEM_ERROR };
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, SYSTEM_ERROR);
    mock.confirmReply = null;
    mock.confirmGate = gate().promise;
    await card(page, 'A002').getByRole('button', { name: '返す' }).click();
    await expect(bar(page)).toHaveCount(0);
  });
});

test.describe('S-05 自分の備品：返す', () => {
  test('「返す」のダイアログ：返す備品と今日の返却日（日本時間）が出て、メモは空', async ({ page }) => {
    await openMine(page, [item(1), item(2)]);
    await card(page, 'A002').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await expect(dialog).toContainText('返す備品　A002　PC　Lenovo ThinkPad X2');
    await expect(dialog).toContainText(`返却日　${todayInJapan()}`);
    await expect(dialog.getByLabel('メモ')).toHaveValue('');
  });

  test('「キャンセル」で閉じ、入力したメモは捨てられる（開き直すと空）。何も送らない', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await dialog.getByLabel('メモ').fill('消えるメモ');
    await dialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(dialog).toHaveCount(0);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    await expect(page.getByRole('dialog', { name: '返す' }).getByLabel('メモ')).toHaveValue('');
    expect(mock.returnCalls).toEqual([]);
  });

  test('返す：貸出履歴の ID とメモを送り、「返却しました（A001）」が出て、返した備品は一覧から消える（返却日は送らない）', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await dialog.getByLabel('メモ').fill('  画面にひびあり  ');
    await dialog.getByRole('button', { name: '返す', exact: true }).click();
    await expectSuccess(page, '返却しました（A001）');
    expect(mock.returnCalls).toEqual([{ loanId: 101, body: { memo: '画面にひびあり' } }]);
    await expect(dialog).toHaveCount(0);
    await expect(card(page, 'A001')).toHaveCount(0);
    await expect(card(page, 'A002')).toBeVisible();
    expect(mock.gets).toBe(mock.initialGets);
  });

  test('メモが空（空白だけ）なら、null を送る', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await dialog.getByLabel('メモ').fill('   ');
    await dialog.getByRole('button', { name: '返す', exact: true }).click();
    await expectSuccess(page, '返却しました（A001）');
    expect(mock.returnCalls).toEqual([{ loanId: 101, body: { memo: null } }]);
  });

  test('最後の1件を返すと、一覧は「借りている備品はありません。」になる', async ({ page }) => {
    await openMine(page, [item(1)]);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    await page.getByRole('dialog', { name: '返す' }).getByRole('button', { name: '返す', exact: true }).click();
    await expect(page.getByTestId('my-equipment-empty')).toHaveText('借りている備品はありません。');
    await expect(page.getByRole('button', { name: '＋ 備品を借りる' })).toBeVisible();
  });

  test('メモ：200文字ちょうどは通り（前後の空白を除いて数える）、201文字だと文が出て送らない。入力を変えると文は消える', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    const memo = dialog.getByLabel('メモ');
    await memo.fill('あ'.repeat(201));
    await dialog.getByRole('button', { name: '返す', exact: true }).click();
    // 誤りの文は、メモ欄のすぐ下（同じ入力欄の部品の中）に出る
    const memoField = dialog.locator('.MuiFormControl-root').filter({ has: page.getByLabel('メモ') });
    await expect(memoField).toContainText('メモは200文字以内で入力してください');
    expect(mock.returnCalls).toEqual([]);
    await memo.fill('あ'.repeat(200));
    await expect(dialog).not.toContainText('メモは200文字以内で入力してください');
    await memo.fill(` ${'あ'.repeat(200)} `);
    await dialog.getByRole('button', { name: '返す', exact: true }).click();
    await expectSuccess(page, '返却しました（A001）');
    expect(mock.returnCalls).toEqual([{ loanId: 101, body: { memo: 'あ'.repeat(200) } }]);
  });

  test('サーバーが「メモの誤り」（400・field が memo）を返したら、ダイアログを開いたまま、メモ欄の下に出す', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    mock.returnReply = { status: 400, message: '入力内容に誤りがあります', errors: [{ field: 'memo', message: 'メモは200文字以内で入力してください' }] };
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await dialog.getByLabel('メモ').fill('メモ');
    await dialog.getByRole('button', { name: '返す', exact: true }).click();
    await expect(dialog).toContainText('メモは200文字以内で入力してください');
    await expect(bar(page)).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });

  test('送っている間は、「返す」「キャンセル」が押せず、窓の外・Esc でも閉じない。終わると閉じて、緑の帯が出る', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    const g = gate();
    mock.returnGate = g.promise;
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await dialog.getByRole('button', { name: '返す', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '返す', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
    expect(mock.returnCalls).toHaveLength(1);
    g.release();
    await expectSuccess(page, '返却しました（A001）');
    await expect(dialog).toHaveCount(0);
  });

  test('キャンセル以外の閉じ方：窓の外・Esc でも閉じ、何も送らない', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    const dialog = page.getByRole('dialog', { name: '返す' });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
    expect(mock.returnCalls).toEqual([]);
  });

  test('長い備品名でも、ダイアログが横にあふれない', async ({ page }) => {
    await openMine(page, [item(1, { managementNo: 'A'.repeat(60), model: 'X'.repeat(90) })]);
    await page.getByRole('button', { name: '返す' }).click();
    await expect(page.getByRole('dialog', { name: '返す' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const dialogOverflow = await page
      .getByRole('dialog', { name: '返す' })
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(dialogOverflow).toBeLessThanOrEqual(0);
  });
});

test.describe('S-05 自分の備品：操作できなかったとき（詳細設計 9.2）', () => {
  // 401（ログインが切れた）でログイン画面に移ることは、common/api の動き（S-01・common のテスト）で確かめる。S-05 の画面では何も出さない
  /** 「返す」を押して、ダイアログで「返す」を押す */
  async function returnA001(page: Page) {
    await card(page, 'A001').getByRole('button', { name: '返す' }).click();
    await page.getByRole('dialog', { name: '返す' }).getByRole('button', { name: '返す', exact: true }).click();
  }

  test('返す 409（すでに返却されている）：赤の帯を出してダイアログを閉じ、読み直す間は一覧を隠し、最新の一覧を出す', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 409, message: 'この備品はすでに返却されています' };
    // 別の端末で返された、のあとの最新の一覧
    mock.list = listOf([item(2)]);
    const g = gate();
    mock.getGate = g.promise;
    await returnA001(page);
    await expectError(page, 'この備品はすでに返却されています');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // 読み直している間（返事が出るまで）は、古い一覧を出さない
    await expect(page.getByTestId('my-equipment-loading')).toBeVisible();
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(0);
    g.release();
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    await expect(card(page, 'A001')).toHaveCount(0);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });
  test('返す 403（ほかの人が借りている）：赤の帯。一覧はそのまま（読み直さない）', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 403, message: 'ほかの人が借りているため、返却はできません。' };
    await returnA001(page);
    await expectError(page, 'ほかの人が借りているため、返却はできません。');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(2);
    expect(mock.gets).toBe(mock.initialGets);
  });

  test('返す 400（備品が管理中でなくなった）：赤の帯を出して、一覧を最新にする', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 400, message: 'この備品は返却できません。総務へお問い合わせください。' };
    mock.list = listOf([item(2)]);
    await returnA001(page);
    await expectError(page, 'この備品は返却できません。総務へお問い合わせください。');
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('返す 404（貸出履歴が取り消された）：「対象が見つかりません。」を赤の帯に出して、一覧を最新にする', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 404, message: '対象が見つかりません。' };
    mock.list = listOf([item(2)]);
    await returnA001(page);
    await expectError(page, '対象が見つかりません。');
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('返す 500：赤の帯。ダイアログを閉じ、一覧はそのまま', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 500, message: SYSTEM_ERROR };
    await returnA001(page);
    await expectError(page, SYSTEM_ERROR);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(2);
    expect(mock.gets).toBe(mock.initialGets);
  });

  test('確認 403（借りていない備品が含まれている）：赤の帯を出して、一覧を最新にする', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 403, message: '借りていない備品が含まれているため、確認できません。' };
    mock.list = listOf([item(2)]);
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, '借りていない備品が含まれているため、確認できません。');
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('確認 400（管理中でなくなった備品）：赤の帯を出して、一覧を最新にする', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 400, message: '管理中の備品だけ確認できます' };
    mock.list = listOf([item(2)]);
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, '管理中の備品だけ確認できます');
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('確認 404（備品がない）：S-19 には移らず、「対象が見つかりません。」を赤の帯に出して、一覧を最新にする', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 404, message: '対象が見つかりません。' };
    mock.list = listOf([item(2)]);
    await page.getByRole('button', { name: 'まとめて確認した（2件）' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, '対象が見つかりません。');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('error-page')).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('確認 500：赤の帯。一覧はそのまま', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 500, message: SYSTEM_ERROR };
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, SYSTEM_ERROR);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(2);
    await expect(card(page, 'A001').getByRole('button', { name: '確認した', exact: true })).toBeEnabled();
    expect(mock.gets).toBe(mock.initialGets);
  });

  test('画面を開いて一覧を読むのに失敗したら、帯ではなく S-19（システムの不具合）を出す', async ({ page }) => {
    await loginAs(page, 'ippan');
    const mock = await mockMine(page, [item(1)]);
    mock.getReply = { status: 500, message: SYSTEM_ERROR };
    await page.goto('/my-equipment');
    await expect(page.getByTestId('error-page')).toHaveText(SYSTEM_ERROR);
    await expect(bar(page)).toHaveCount(0);
  });

  test('操作のあとの読み直しに失敗したら、S-19 を出す', async ({ page }) => {
    const mock = await openMine(page, [item(1)]);
    mock.returnReply = { status: 409, message: 'この備品はすでに返却されています' };
    mock.getReply = { status: 500, message: SYSTEM_ERROR };
    await returnA001(page);
    await expect(page.getByTestId('error-page')).toHaveText(SYSTEM_ERROR);
  });

  test('返す 403（権限項目がない）：赤の帯。ダイアログを閉じ、一覧はそのまま', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 403, message: 'この操作を行う権限がありません。' };
    await returnA001(page);
    await expectError(page, 'この操作を行う権限がありません。');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(2);
    expect(mock.gets).toBe(mock.initialGets);
  });

  test('確認 403（権限項目がない）：一覧を読み直し、その読み直しが 403 になって S-19（権限がない）が出る', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 403, message: 'この操作を行う権限がありません。' };
    mock.getReply = { status: 403, message: 'この操作を行う権限がありません。' };
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expect(page.getByTestId('error-page')).toHaveText('このページを見る権限がありません。');
  });

  test('返す 400（errors がない・field が memo でない）：サーバーの文を赤の帯に出して、一覧を最新にする。メモ欄の下には出さない', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.returnReply = { status: 400, message: '入力内容に誤りがあります', errors: [{ field: 'loanId', message: '貸出履歴の指定が正しくありません' }] };
    mock.list = listOf([item(2)]);
    await returnA001(page);
    await expectError(page, '入力内容に誤りがあります');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(1);
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('確認 400（errors がない。備品の指定が空など）：サーバーの文を赤の帯に出して、一覧を最新にする', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.confirmReply = { status: 400, message: '確認する備品を指定してください' };
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, '確認する備品を指定してください');
    expect(mock.gets).toBe(mock.initialGets + 1);
  });

  test('つながらないとき：画面設計の「問題が発生しました。…」を赤の帯に出す。一覧はそのまま', async ({ page }) => {
    const mock = await openMine(page, [item(1), item(2)]);
    mock.networkDown = true;
    await card(page, 'A001').getByRole('button', { name: '確認した', exact: true }).click();
    await expectError(page, SYSTEM_ERROR);
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(2);
    expect(mock.gets).toBe(mock.initialGets);
  });
});

test.describe('S-05 自分の備品：権限とメニュー', () => {
  /** ログイン中の人の権限項目から、いくつかを外して返す（A-03 の返事を差し替える） */
  async function withoutPermissions(page: Page, removed: string[]) {
    await page.route('**/api/auth/me', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      json.data.permissions = (json.data.permissions as string[]).filter((p) => !removed.includes(p));
      await route.fulfill({ response, json });
    });
  }

  test('メニューに「自分の備品」が出て、押すと S-05 が開く（本物のログイン）', async ({ page }, testInfo) => {
    await loginAs(page, 'ippan');
    if (testInfo.project.name === 'smartphone') {
      await page.getByRole('button', { name: 'メニュー' }).click();
      await page.getByRole('menuitem', { name: '自分の備品' }).click();
    } else {
      await page.getByTestId('header-menu').getByRole('link', { name: '自分の備品' }).click();
    }
    await expect(page).toHaveURL('/my-equipment');
    await expect(page.getByRole('heading', { name: '自分の備品' })).toBeVisible();
  });

  test('「備品を借りる・返す（自分）」を持たない人には、権限がない文を出し、一覧（B-01）は読まない', async ({ page }) => {
    await loginAs(page, 'ippan');
    await withoutPermissions(page, ['LOAN_SELF']);
    const mock = await mockMine(page, [item(1)]);
    await page.goto('/my-equipment');
    await expect(page.getByTestId('error-page')).toHaveText('このページを見る権限がありません。');
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(0);
    expect(mock.gets).toBe(0);
  });

  test('確認の権限（CONFIRM_SELF）を持たない人には、「確認した」「確認済み」「まとめて確認した」を出さない。「返す」は出る', async ({ page }) => {
    await loginAs(page, 'ippan');
    await withoutPermissions(page, ['CONFIRM_SELF']);
    await mockMine(page, [item(1), item(2, { confirmedThisMonth: true })]);
    await page.goto('/my-equipment');
    await expect(page.getByTestId('my-equipment-card')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /確認した|確認済み/ })).toHaveCount(0);
    await expect(card(page, 'A001').getByRole('button', { name: '返す' })).toBeVisible();
  });

  test('「備品を借りる・返す（自分）」を持たない人には、メニューに「自分の備品」が出ない', async ({ page }) => {
    await loginAs(page, 'ippan');
    await withoutPermissions(page, ['LOAN_SELF']);
    await page.goto('/');
    await expect(page.getByTestId('top-placeholder')).toBeVisible();
    await expect(page.getByRole('link', { name: '自分の備品' })).toHaveCount(0);
    // スマートフォンの「≡」は、開ける画面がなければ出ない
    await expect(page.getByRole('button', { name: 'メニュー' })).toHaveCount(0);
  });
});
