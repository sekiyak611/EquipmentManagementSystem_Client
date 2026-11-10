// 押したら、処理が終わるまで押せなくなるボタン（画面設計 1.3、CLAUDE.md 5章、詳細設計 common.md 11.6）
import { useRef, useState } from 'react';
import Button, { type ButtonProps } from '@mui/material/Button';

type SubmitButtonProps = Omit<ButtonProps, 'onClick'> & {
  /** 押したときの処理。終わるまでボタンを押せなくする */
  onClick: () => Promise<unknown> | void;
};

export function SubmitButton({ onClick, disabled, variant = 'contained', ...rest }: SubmitButtonProps) {
  const [running, setRunning] = useState(false);
  // 画面の更新より先に2回目が押されても、処理を2回動かさないための印
  const runningRef = useRef(false);

  const handleClick = async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setRunning(true);
    try {
      await onClick();
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  return <Button {...rest} variant={variant} disabled={disabled || running} onClick={handleClick} />;
}
