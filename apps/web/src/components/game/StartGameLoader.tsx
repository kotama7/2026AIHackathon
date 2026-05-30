'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui';

const MESSAGES = [
  '事件の骨格を組み立てています…',
  '住民たちの思惑を編成しています…',
  '夜のタイムラインを敷いています…',
  '証拠と証言を村に配置しています…',
  '推理可能性を最終検証しています…',
];

/** 全体推定時間 (ms)。Truth Compiler が一発成功するまでに想定 */
const ESTIMATED_MS = 60_000;
const MESSAGE_INTERVAL_MS = 6_500;
const SLOW_WARNING_MS = ESTIMATED_MS;

type Props = {
  error: Error | null;
  onRetry: () => void;
  onUseSeed: () => void;
};

export function StartGameLoader({ error, onRetry, onUseSeed }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Date.now() - start), 200);
    const cycle = setInterval(
      () => setMessageIndex((i) => (i + 1) % MESSAGES.length),
      MESSAGE_INTERVAL_MS
    );
    return () => {
      clearInterval(tick);
      clearInterval(cycle);
    };
  }, [error]);

  const progressPct = useMemo(() => Math.min(100, (elapsed / ESTIMATED_MS) * 100), [elapsed]);
  const isSlow = elapsed > SLOW_WARNING_MS;

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-overlay backdrop-blur-sm p-page">
        <div className="flex max-w-prose flex-col items-center gap-card rounded-card border border-brand-danger/40 bg-brand-surface p-page text-center shadow-modal">
          <p className="font-serif text-2xl text-brand-danger">事件の構築に失敗しました</p>
          <p className="text-sm text-brand-muted">{error.message}</p>
          <div className="mt-card flex gap-card">
            <Button variant="secondary" onClick={onRetry}>
              もう一度試す
            </Button>
            <Button variant="primary" onClick={onUseSeed}>
              シードゲームで開始
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-overlay backdrop-blur-sm p-page">
      <div className="flex max-w-prose flex-col items-center gap-section">
        <p className="font-serif text-3xl text-brand-gold">事件を構築しています</p>
        <p
          key={messageIndex}
          className="animate-fade-in text-center font-serif text-lg text-brand-emphasis"
        >
          {MESSAGES[messageIndex]}
        </p>
        <div className="flex w-full max-w-md flex-col items-center gap-2">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="生成進捗"
          >
            <div
              className="h-full bg-brand-gold transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-brand-muted">
            {isSlow
              ? 'もう少しお待ちください。複雑な事件は時間がかかることがあります。'
              : `推定 ${Math.max(0, Math.ceil((ESTIMATED_MS - elapsed) / 1000))} 秒`}
          </p>
        </div>
      </div>
    </div>
  );
}
