// S-05 だけで使う、日時の表示の部品（詳細設計 equipment/mine/S-05_自分の備品.md 3.2・10章 No.6・No.9）。
// 2つ目の画面で要るようになったら、common/format に移す（2人で相談）。
import { formatDate } from '../../../../common/format/format';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 催促の日時（"2026-11-25T09:00:00+09:00"。日本時間）を「11/25（水）9:00」の形にする。
 * 月・日は0を付けない。時刻は H:mm。曜日は日付だけから求める（時差の影響を受けない）。読めなければ空文字
 */
export function reminderText(reminderAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(reminderAt);
  if (!match) {
    return '';
  }
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}（${weekday}）${Number(match[4])}:${match[5]}`;
}

/** 日本時間の今日の日付を「2026/11/25」の形で返す。ブラウザの時計から求める（表示だけ。10章 No.6） */
export function todayInJapanText(now: Date = new Date()): string {
  const japan = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return formatDate(japan.toISOString());
}
