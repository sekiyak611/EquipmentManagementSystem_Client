// APIの値を取り込んで持っておく部品（詳細設計 common.md 11.3）。
// 使い方：const { data, loading, error, reload } = useApi(() => apiGet<型>('/api/...'), [依存する値]);
import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiError } from './client';

export type UseApiResult<T> = {
  /** 読み込んだ値。まだ読み込んでいない・失敗したときは null */
  data: T | null;
  /** 読み込み中なら true */
  loading: boolean;
  /** 失敗したときのエラー */
  error: ApiError | null;
  /** もう一度読み込む */
  reload: () => void;
};

export function useApi<T>(loader: () => Promise<T>, deps: DependencyList): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [count, setCount] = useState(0);

  // deps（依存する値）が変わったときだけ読み込み直す。deps は呼ぶ側が渡す（React の useEffect と同じ考え方）
  const load = useCallback(loader, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load()
      .then((value) => {
        if (active) {
          setData(value);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setData(null);
          setError(e instanceof ApiError ? e : new ApiError(0, String(e), null));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      // 画面を閉じたあとに値を入れないようにする
      active = false;
    };
  }, [load, count]);

  const reload = useCallback(() => setCount((c) => c + 1), []);
  return { data, loading, error, reload };
}
