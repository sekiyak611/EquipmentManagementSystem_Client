// 画面を描く途中で不具合が起きる見本の画面（開発とテストのときだけ開ける。詳細設計 common.md 11.10）。
// 開くと必ず例外を投げ、S-19（システムの不具合）が出ることをテストで確かめる
export function CrashSamplePage(): never {
  throw new Error('画面の不具合の見本（テスト用）');
}
