'use client';

import type { GamePhase } from '@village/shared';
import { useEffect, useState } from 'react';

import { cn } from '@/components/ui/cn';
import { useGameStore } from '@/stores/gameStore';

type PhaseStyle = {
  icon: string;
  title: string;
  subtitle: string;
  bg: string;
  text: string;
};

const PHASE_STYLES: Record<GamePhase, PhaseStyle | null> = {
  morning: {
    icon: '☀',
    title: '朝',
    subtitle: '陽が昇り、村に新たな一日が始まる',
    bg: 'bg-gradient-to-b from-[#2a2418] to-brand-bg',
    text: 'text-brand-gold',
  },
  discussion: {
    icon: '◯◯◯',
    title: '議論',
    subtitle: '住民たちが集い、それぞれの主張を投げかける',
    bg: 'bg-brand-bg',
    text: 'text-brand-emphasis',
  },
  investigation: {
    icon: '?',
    title: '調査',
    subtitle: '尋問の時間。証拠と証言を突き合わせよ',
    bg: 'bg-brand-bg',
    text: 'text-brand-emphasis',
  },
  organize: null,
  trial: {
    icon: '⚖',
    title: '裁判',
    subtitle: '判決の刻。誰を処刑するか、決断せよ',
    bg: 'bg-gradient-to-b from-[#3a1818] to-brand-bg',
    text: 'text-brand-danger',
  },
  night: {
    icon: '🌙',
    title: '夜',
    subtitle: '闇が降りる。誰が次の犠牲者になるのか',
    bg: 'bg-black',
    text: 'text-brand-gold',
  },
  result: {
    icon: '★',
    title: '終局',
    subtitle: '真相が明かされる',
    bg: 'bg-brand-bg',
    text: 'text-brand-gold',
  },
};

const TRANSITION_MS = 1600;

export function PhaseTransition() {
  const phase = useGameStore((s) => s.meta?.currentPhase ?? null);
  const day = useGameStore((s) => s.meta?.currentDay ?? null);
  const [shown, setShown] = useState<{ phase: GamePhase; day: number | null } | null>(null);
  const [prev, setPrev] = useState<GamePhase | null>(null);

  useEffect(() => {
    if (!phase) return;
    if (prev === null) {
      // 初回マウント時はトランジションを出さない
      setPrev(phase);
      return;
    }
    if (phase !== prev) {
      setPrev(phase);
      setShown({ phase, day });
      const timer = setTimeout(() => setShown(null), TRANSITION_MS);
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShown(null);
      };
      window.addEventListener('keydown', handleKey);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKey);
      };
    }
  }, [phase, prev, day]);

  if (!shown) return null;
  const style = PHASE_STYLES[shown.phase];
  if (!style) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setShown(null)}
      className={cn(
        'fixed inset-0 z-50 flex animate-fade-in cursor-pointer items-center justify-center backdrop-blur-sm',
        style.bg
      )}
    >
      <div className="flex flex-col items-center gap-card text-center">
        <span aria-hidden className={cn('text-7xl', style.text)}>
          {style.icon}
        </span>
        {shown.day !== null && <span className="text-sm text-brand-muted">Day {shown.day}</span>}
        <p className={cn('font-serif text-5xl tracking-display', style.text)}>{style.title}</p>
        <p className="max-w-prose text-sm text-brand-muted">{style.subtitle}</p>
        <p className="mt-section text-xs text-brand-muted opacity-60">クリック / ESC でスキップ</p>
      </div>
    </div>
  );
}
