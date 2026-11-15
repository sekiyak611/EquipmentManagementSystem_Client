// category の API で受け渡す値の型（API設計 3.6、詳細設計 equipment/category/K-01〜K-04。形は Server の api.equipment.category の受け取る値・返す値と同じ。名前は中身が分かる名前にする。CLAUDE.md 5章の命名規則）

/** 種別の1件（K-01 の data の1件。K-02・K-03 の data） */
export type CategoryResponse = {
  id: number;
  name: string;
  /** 頭文字（大文字1文字）。頭文字がない種別は null */
  initial: string | null;
  /** 使っている備品の数（削除されていない備品） */
  equipmentCount: number;
  /** K-03 で送り返す番号（楽観ロック） */
  version: number;
};

/** K-02 種別を追加する */
export type CategoryCreateRequest = {
  name: string;
  initial: string | null;
};

/** K-03 種別を変える */
export type CategoryUpdateRequest = {
  name: string;
  initial: string | null;
  version: number;
};
