'use client';

import type { ScoreRank } from '@village/shared';

import { cn } from '@/components/ui/cn';

const RANK_STYLE: Record<ScoreRank, { ring: string; text: string; label: string }> = {
  S: { ring: 'border-brand-gold ring-brand-gold/40', text: 'text-brand-gold', label: '完全裁判' },
  A: {
    ring: 'border-brand-success ring-brand-success/40',
    text: 'text-brand-success',
    label: '優秀な監査官',
  },
  B: { ring: 'border-brand-info ring-brand-info/40', text: 'text-brand-info', label: '通常解決' },
  C: {
    ring: 'border-brand-muted ring-brand-muted/30',
    text: 'text-brand-muted',
    label: '犠牲多数',
  },
  D: {
    ring: 'border-brand-danger ring-brand-danger/40',
    text: 'text-brand-danger',
    label: '冤罪裁判',
  },
};

export function RankBadge({ rank, size = 'lg' }: { rank: ScoreRank; size?: 'sm' | 'lg' }) {
  const style = RANK_STYLE[rank];
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          'flex items-center justify-center rounded-full border-4 font-serif ring-4',
          style.ring,
          style.text,
          size === 'lg' ? 'h-32 w-32 text-7xl' : 'h-12 w-12 text-2xl'
        )}
      >
        {rank}
      </span>
      <span className={cn('font-serif text-sm', style.text)}>{style.label}</span>
    </div>
  );
}
