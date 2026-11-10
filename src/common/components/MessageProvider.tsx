// メッセージの帯（画面設計 1.2、詳細設計 common.md 11.5）。
// 各画面からは const message = useMessage(); message.success('…') のように使う。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';

/** 完了の帯を出しておく時間（画面設計 1.2：5秒で消える） */
const SUCCESS_DISPLAY_MS = 5000;

type Message = { kind: 'success' | 'error'; text: string; id: number };

type MessageApi = {
  /** 完了：緑の帯。5秒で消える */
  success: (text: string) => void;
  /** 操作できなかった：赤の帯。×を押すまで残る */
  error: (text: string) => void;
  /** 帯を消す */
  clear: () => void;
};

const MessageContext = createContext<MessageApi | null>(null);
const CurrentMessageContext = createContext<{ message: Message | null; clear: () => void } | null>(null);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);

  const clear = useCallback(() => setMessage(null), []);
  // 帯は1つだけ出す。新しいメッセージを出すと、前の帯は消える（common.md 11.8 の4）
  const show = useCallback((kind: Message['kind'], text: string) => {
    setMessage({ kind, text, id: Date.now() + Math.random() });
  }, []);

  useEffect(() => {
    if (message?.kind !== 'success') {
      return undefined;
    }
    const timer = window.setTimeout(() => setMessage(null), SUCCESS_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  const api = useMemo<MessageApi>(
    () => ({ success: (t) => show('success', t), error: (t) => show('error', t), clear }),
    [show, clear],
  );
  const current = useMemo(() => ({ message, clear }), [message, clear]);

  return (
    <MessageContext.Provider value={api}>
      <CurrentMessageContext.Provider value={current}>{children}</CurrentMessageContext.Provider>
    </MessageContext.Provider>
  );
}

/** メッセージを出す */
export function useMessage(): MessageApi {
  const api = useContext(MessageContext);
  if (!api) {
    throw new Error('useMessage は MessageProvider の中で使う');
  }
  return api;
}

/** 帯そのもの。AppLayout がヘッダーのすぐ下に置く */
export function MessageBar() {
  const current = useContext(CurrentMessageContext);
  if (!current?.message) {
    return null;
  }
  const { message, clear } = current;
  return (
    <Alert
      key={message.id}
      severity={message.kind}
      variant="filled"
      square
      role={message.kind === 'error' ? 'alert' : 'status'}
      data-testid="message-bar"
      // 赤の帯だけ、×で閉じる（緑の帯は5秒で消える）
      onClose={message.kind === 'error' ? clear : undefined}
    >
      {message.text}
    </Alert>
  );
}
