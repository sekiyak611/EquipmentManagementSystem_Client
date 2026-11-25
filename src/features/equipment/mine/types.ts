// mine（自分の備品）の API で受け渡す値の型（詳細設計 equipment/mine/S-05_自分の備品.md 7章。B-01 の3章と同じ形）

/** 借りている備品の1件（B-01） */
export type MyLoanItemResponse = {
  loanId: number;
  equipmentId: number;
  managementNo: string;
  categoryName: string;
  maker: string | null;
  model: string | null;
  /** 貸出日（"2026-10-01"） */
  lentOn: string;
  /** 返却予定日。なければ null */
  dueOn: string | null;
  /** 返却予定日を過ぎているか */
  overdue: boolean;
  /** 最終確認日。未記入なら null */
  lastConfirmedOn: string | null;
  /** 今月確認済みか */
  confirmedThisMonth: boolean;
};

/** 自分の備品の一覧と今月の確認の案内。B-01・B-03・B-04 が同じ形で返す */
export type MyLoansResponse = {
  /** 今月まだ確認していない備品の数 */
  unconfirmedCount: number;
  /** 今月の催促の日時（日本時間。"2026-11-25T09:00:00+09:00"） */
  reminderAt: string;
  /** 今月の催促の日時を過ぎたか */
  reminderPassed: boolean;
  items: MyLoanItemResponse[];
};

/** B-04 に送る値 */
export type ConfirmRequest = {
  equipmentIds: number[];
};

/** B-03 に送る値 */
export type ReturnRequest = {
  memo: string | null;
};
