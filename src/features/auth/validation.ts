// auth の画面で共通の入力チェック（詳細設計 auth/S-02_パスワード再設定の依頼.md の2.2・10章 No.7、auth/S-03_パスワード設定.md の4章）。
// メールアドレスのチェックは、もとは S-01（LoginPage.tsx）の中にあった（S-01・S-02 で使う）。
// 新しいパスワードのチェックは S-03・S-04 で使う。

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

/** パスワードの長さの下限・上限（画面設計 8章） */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

/** 半角の英字・数字・記号・スペース（0x20〜0x7E）だけか（空は false） */
function isAllowedCharacters(password: string): boolean {
  return password !== '' && /^[\x20-\x7E]+$/.test(password);
}

/**
 * 新しいパスワードの入力チェック（画面設計 8章。Server の NewPasswordFormat と同じ順番・同じ文）。
 * 1つの欄に1つだけ返す：空 → 使えない文字 → 短い → 長い。誤りがなければ undefined。
 * 前後の空白も取らない（スペースも使えるため）。
 */
export function validateNewPassword(password: string): string | undefined {
  if (password === '') {
    return '新しいパスワードを入力してください';
  }
  if (!isAllowedCharacters(password)) {
    return 'パスワードに使えるのは、半角の英字・数字・記号・スペースです';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'パスワードは8文字以上で入力してください';
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return 'パスワードは64文字以内で入力してください';
  }
  return undefined;
}

/** 新しいパスワード（確認）の入力チェック（画面設計 6章・7章）。違うとき（空のときも）は、画面設計のメッセージ。 */
export function validatePasswordConfirm(password: string, passwordConfirm: string): string | undefined {
  return password === passwordConfirm ? undefined : '確認用のパスワードが一致しません';
}

/** 決まりの横の ✓ のための判定（画面設計 6章・8章）。満たしていれば true */
export type PasswordRuleChecks = {
  /** 8文字以上、64文字以内 */
  length: boolean;
  /** 使える文字：半角の英字・数字・記号・スペース（1文字以上で、すべてそうであるとき） */
  characters: boolean;
};

export function checkPasswordRules(password: string): PasswordRuleChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    characters: isAllowedCharacters(password),
  };
}
