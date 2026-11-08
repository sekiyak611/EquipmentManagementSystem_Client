// 日付と空の値の表示の形（画面設計 1.3、詳細設計 common.md 11.2）

/** 空の値のときに出す文字 */
export const EMPTY = '―';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * APIの日付（"2026-11-02"）か日時（"2026-11-25T09:00:00+09:00"）の、日付の部分を取り出す。
 * サーバーはいつも日本時間で返すので、先頭の10文字が日本の日付になる（API設計 2.1）。
 */
function parts(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** 2026/11/02 の形。値がなければ「―」 */
export function formatDate(value: string | null | undefined): string {
  const p = value ? parts(value) : null;
  if (!p) {
    return EMPTY;
  }
  const [y, m, d] = p;
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

/** 2026/11/02（月）の形。値がなければ「―」 */
export function formatDateWithWeekday(value: string | null | undefined): string {
  const p = value ? parts(value) : null;
  if (!p) {
    return EMPTY;
  }
  const [y, m, d] = p;
  // 曜日だけを求める。時差の影響を受けないよう、UTC の日付として計算する
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${formatDate(value)}（${weekday}）`;
}

/** 値がなければ「―」、あればそのまま */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return EMPTY;
  }
  return String(value);
}
