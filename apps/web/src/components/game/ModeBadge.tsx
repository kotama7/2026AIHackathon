'use client';

import { cn } from '@/components/ui/cn';
import { getClientMode, MODE_LABEL } from '@/lib/mode';

const TONE_BY_MODE: Record<ReturnType<typeof getClientMode>, string> = {
  mock: 'border-brand-gold/40 bg-brand-gold/15 text-brand-gold',
  emulator: 'border-brand-info/40 bg-brand-info/15 text-brand-info',
  prod: 'border-brand-danger/40 bg-brand-danger/15 text-brand-danger',
};

/**
 * 現在の Functions 接続モードを示す小さなバッジ。
 * テスト・検証時に「今モックなのか、emulator なのか、本番なのか」を即座に確認できる。
 */
export function ModeBadge() {
  const mode = getClientMode();
  const meta = MODE_LABEL[mode];
  return (
    <span
      title={meta.description}
      className={cn(
        'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        TONE_BY_MODE[mode]
      )}
    >
      {meta.label}
    </span>
  );
}
