// APIを呼ぶ部品（詳細設計 common.md 11.3、API設計 2章）。
// 各機能の api.ts から apiGet・apiPost・apiPut・apiDelete を使う。

/** 返す値の errors の1件（API設計 2.4） */
export type ErrorItem = {
  field: string | null;
  message: string;
  /** CSVの行番号（CSVの行のエラーのときだけ） */
  row?: number;
  /** CSVのその行の管理番号（CSVの行のエラーのときだけ） */
  managementNo?: string;
};

/** APIが返す値の形（API設計 2.4） */
type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
  errors: ErrorItem[] | null;
};

/** サーバーの答えが読めなかったときの文（API設計 2.4 の 500 と同じ） */
const UNREADABLE_MESSAGE =
  '問題が発生しました。時間をおいて、もう一度お試しください。続く場合は総務に連絡してください。';

/** APIが失敗したときに投げるエラー。各画面は message を赤の帯に、errors を入力欄の下に出す */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: ErrorItem[];

  constructor(status: number, message: string, errors: ErrorItem[] | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? [];
  }

  /** 入力欄の名前ごとのメッセージ（同じ欄に2つ以上あれば最初のもの） */
  fieldMessages(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const item of this.errors) {
      if (item.field && !(item.field in result)) {
        result[item.field] = item.message;
      }
    }
    return result;
  }
}

/** 401（ログインしていない）のときに呼ぶ処理。main.tsx で、ログイン画面に移す処理を入れる */
let unauthorizedHandler: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

/** クッキー XSRF-TOKEN（なりすまし対策の合言葉）の値 */
function readXsrfToken(): string | null {
  const found = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('XSRF-TOKEN='));
  return found ? decodeURIComponent(found.substring('XSRF-TOKEN='.length)) : null;
}

/**
 * 合言葉を用意する。クッキーがまだなければ、GET /api/health を呼んで受け取る。
 * 開発中は画面を Vite が配るので、最初はクッキーがないため（common.md 11.8 の3）。
 */
async function ensureXsrfToken(): Promise<string | null> {
  const token = readXsrfToken();
  if (token) {
    return token;
  }
  await fetch('/api/health', { credentials: 'same-origin' });
  return readXsrfToken();
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    const token = await ensureXsrfToken();
    if (token) {
      headers['X-XSRF-TOKEN'] = token;
    }
  }
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    // ファイルのアップロード（API設計 2.6）。Content-Type はブラウザが付ける
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' });

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }

  if (response.status === 401) {
    unauthorizedHandler();
  }
  if (!json || typeof json.status !== 'number') {
    // JSON でない答え（サーバーが止まっていて、Vite が 502 などを返した、など）
    throw new ApiError(response.status, UNREADABLE_MESSAGE, null);
  }
  if (!response.ok) {
    throw new ApiError(json.status, json.message, json.errors);
  }
  return json.data;
}

/** 読む（GET） */
export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

/** 作る・実行する（POST） */
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

/** 変える（PUT） */
export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

/** 消す（DELETE） */
export function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}
