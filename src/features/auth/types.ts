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

/** A-05 合言葉の確認で送る値（詳細設計 auth/A-05_合言葉の確認.md の2.3） */
export type PasswordTokenVerifyRequest = {
  token: string;
};

/** リンクの用途（Server の PasswordLinkPurpose）。REGISTER（ユーザ登録）のときだけ、S-03 の見出しが「パスワードの設定」になる */
export type PasswordLinkPurpose = 'RESET' | 'REGISTER' | 'LOCK';

/** A-05 合言葉の確認が返す値（詳細設計 auth/A-05_合言葉の確認.md の3.1） */
export type PasswordTokenVerifyResponse = {
  /** 対象のメールアドレス（画面に表示するだけ） */
  email: string;
  purpose: PasswordLinkPurpose;
};

/** A-06 合言葉でパスワードを決めるで送る値（API設計 4.4、詳細設計 auth/A-06_合言葉でパスワードを決める.md の2.3） */
export type PasswordTokenUseRequest = {
  token: string;
  password: string;
  passwordConfirm: string;
};
