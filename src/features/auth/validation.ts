// auth の画面で共通の入力チェック（詳細設計 auth/S-02_パスワード再設定の依頼.md の2.2・10章 No.7）。
// もとは S-01（LoginPage.tsx）の中にあったメールアドレスのチェック。S-01・S-02 で同じものを使う。

/** メールアドレスの文字数の上限（画面設計 2章・5章） */
const EMAIL_MAX_LENGTH = 254;

/** メールアドレスの形：@ の前後に文字があり、@ の後ろに「.」があり、空白がない */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * メールアドレスの入力チェック。誤りがあれば、画面設計のメッセージを返す。なければ undefined。
 * 文は画面設計 2章・5章のまま：空は「メールアドレスを入力してください」、254文字を超える・形が違うは「メールアドレスの形が正しくありません」。
 */
export function validateEmail(email: string): string | undefined {
  if (email.trim() === '') {
    return 'メールアドレスを入力してください';
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return 'メールアドレスの形が正しくありません';
  }
  return undefined;
}
