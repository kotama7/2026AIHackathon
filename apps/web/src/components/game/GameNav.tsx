'use client';

import type { GamePhase } from '@village/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

import { PhaseTransition } from '@/components/game/PhaseTransition';
import { cn } from '@/components/ui/cn';
import { useSyncFirestoreToStore } from '@/hooks/useSyncFirestoreToStore';
import { useGamePhaseInfo, useRemainingPoints } from '@/stores/gameStore';

type Section = {
  slug: string;
  label: string;
  /** これらフェーズの時のみ有効。空配列なら常に有効 */
  enabledIn: GamePhase[];
};

const SECTIONS: Section[] = [
  { slug: '', label: '概要', enabledIn: [] },
  { slug: 'discussion', label: '議論', enabledIn: [] },
  { slug: 'evidence', label: '証拠', enabledIn: [] },
  { slug: 'interrogate', label: '尋問', enabledIn: ['investigation'] },
  { slug: 'pins', label: 'ピン', enabledIn: [] },
  { slug: 'trial', label: '裁判', enabledIn: ['trial'] },
  { slug: 'night', label: '夜', enabledIn: ['night'] },
  { slug: 'result', label: '結果', enabledIn: ['result'] },
];

const PHASE_LABELS: Record<GamePhase, string> = {
  morning: '朝',
  discussion: '議論',
  investigation: '調査',
  organize: '整理',
  trial: '裁判',
  night: '夜',
  result: '終了',
};

export function GameNav({ gameId, children }: { gameId: string; children: ReactNode }) {
  // Firestore listener を起動 (mock モードなら no-op)
  useSyncFirestoreToStore(gameId);

  const { day, phase, status } = useGamePhaseInfo();
  const remainingPoints = useRemainingPoints();
  const pathname = usePathname();

  const gameEnded = status !== null && status !== 'in_progress';

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => {
        const href = s.slug ? `/play/${gameId}/${s.slug}` : `/play/${gameId}`;
        // result は phase=='result' でなくとも status が終局していれば閲覧可
        const enabled =
          s.slug === 'result'
            ? gameEnded || phase === 'result'
            : s.enabledIn.length === 0 || (phase !== null && s.enabledIn.includes(phase));
        const active = pathname === href || (s.slug === '' && pathname === `/play/${gameId}`);
        return { ...s, href, enabled: Boolean(enabled), active };
      }),
    [gameId, phase, pathname, gameEnded]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-brand-border bg-brand-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-board flex-wrap items-center justify-between gap-card px-page py-card">
          <div className="flex items-center gap-card">
            <Link
              href="/"
              className="font-serif text-xl text-brand-gold transition hover:opacity-80"
            >
              AI村裁判
            </Link>
            {day && phase && (
              <span className="rounded-card border border-brand-border bg-brand-bg px-3 py-1 text-xs text-brand-muted">
                Day {day} / {PHASE_LABELS[phase]}
              </span>
            )}
            {status && status !== 'in_progress' && (
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs',
                  status === 'won'
                    ? 'border-brand-success/40 bg-brand-success/15 text-brand-success'
                    : 'border-brand-danger/40 bg-brand-danger/15 text-brand-danger'
                )}
              >
                {status === 'won' ? '勝利' : '敗北'}
              </span>
            )}
          </div>
          <PointsDisplay total={5} remaining={remainingPoints} />
        </div>
        <nav className="mx-auto flex max-w-board flex-wrap gap-2 px-page pb-card text-sm">
          {sections.map((s) => (
            <NavLink key={s.slug || 'home'} {...s} />
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-board flex-1 p-page">{children}</main>
      <PhaseTransition />
    </div>
  );
}

function NavLink({
  href,
  label,
  enabled,
  active,
}: {
  href: string;
  label: string;
  enabled: boolean;
  active: boolean;
}) {
  const classes = cn(
    'rounded-card border px-card py-1 transition',
    active
      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
      : 'border-brand-border text-brand-muted',
    enabled ? 'hover:bg-brand-bg hover:text-brand-text' : 'cursor-not-allowed opacity-40'
  );

  if (!enabled) {
    return (
      <span aria-disabled className={classes} title="現在のフェーズでは利用できません">
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={classes}>
      {label}
    </Link>
  );
}

function PointsDisplay({ total, remaining }: { total: number; remaining: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-brand-muted">尋問残</span>
      <div className="flex gap-1" aria-label={`尋問ポイント残り ${remaining}/${total}`}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2.5 w-2.5 rounded-full border',
              i < remaining
                ? 'border-brand-gold bg-brand-gold'
                : 'border-brand-border bg-transparent'
            )}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-brand-text">
        {remaining}/{total}
      </span>
    </div>
  );
}
