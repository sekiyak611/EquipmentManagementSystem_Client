// 権限項目を持っているかを調べる（ボタンやメニューの出し分けに使う。common.md 11.9）。
// 画面で隠すだけで、確かめはサーバーが行う（機能一覧 4章の共通ルール）
import type { MeResponse } from './types';

export function hasPermission(me: MeResponse | null, code: string): boolean {
  return me?.permissions.includes(code) ?? false;
}
