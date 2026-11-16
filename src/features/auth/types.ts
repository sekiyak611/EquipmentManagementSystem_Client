// auth の API で受け渡す値の型（Server の dto.auth と同じ名前。CLAUDE.md 5章）。
// A-01 の返す値（MeResponse）は、全画面で使うので common/auth/types.ts にある

/** A-01 ログインで送る値（API設計 4.1） */
export type LoginRequest = {
  email: string;
  password: string;
  /** ログインしたままにする（60日間）。今は送るだけ（ZPOP-125） */
  rememberMe: boolean;
};

/** A-04 パスワード設定用のリンクの依頼で送る値（API設計 4.3） */
export type PasswordResetRequest = {
  email: string;
};
