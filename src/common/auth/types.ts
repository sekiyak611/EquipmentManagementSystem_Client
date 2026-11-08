// ログイン中の人の型（API設計 4.2。Server の dto.auth.MeResponse と同じ形）

/** ログインしたあと最初に出す画面（S-07 備品一覧 ／ S-05 自分の備品） */
export type HomePage = 'EQUIPMENT_LIST' | 'MY_EQUIPMENT';

/** A-03 ログイン中の人の情報 */
export type MeResponse = {
  id: number;
  name: string;
  email: string;
  roleName: string;
  /** 権限項目のコード（データ設計 5.3。例：EQUIPMENT_VIEW） */
  permissions: string[];
  homePage: HomePage;
};
