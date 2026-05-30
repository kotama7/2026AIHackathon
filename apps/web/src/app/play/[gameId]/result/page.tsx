'use client';

import type { ScoreBreakdown } from '@village/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use as usePromise } from 'react';

import { RankBadge } from '@/components/game/RankBadge';
import { Badge, Button, cn } from '@/components/ui';
import { useTruthReveal } from '@/hooks/useTruthReveal';
import { useGameStore } from '@/stores/gameStore';

export default function ResultPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const router = useRouter();
  const meta = useGameStore((s) => s.meta);
  const reset = useGameStore((s) => s.reset);

  const isGameOver = meta !== null && meta.status !== 'in_progress';
  const { truthReveal, loading, errorMessage } = useTruthReveal(gameId, isGameOver);

  const isWon = meta?.status === 'won';
  const score = truthReveal?.score ?? null;

  function replay() {
    reset();
    router.push('/?replay=1');
  }

  function backToTitle() {
    router.push('/');
  }

  if (!meta) {
    return <NotReady reason="ゲームのメタ情報が読み込まれていません。" />;
  }
  if (!isGameOver) {
    return (
      <NotReady reason="このゲームはまだ終了していません。裁判フェーズで判決を出してください。" />
    );
  }

  return (
    <div className="space-y-section">
      <header
        className={cn(
          'rounded-card border p-page text-center shadow-card',
          isWon
            ? 'animate-fade-in border-brand-gold/40 bg-gradient-to-b from-brand-gold/10 to-brand-surface'
            : 'border-brand-danger/40 bg-gradient-to-b from-brand-danger/10 to-brand-surface'
        )}
      >
        <Badge tone={isWon ? 'gold' : 'danger'}>{isWon ? '勝利' : '敗北'}</Badge>
        <h1
          className={cn(
            'mt-2 font-serif text-5xl tracking-display',
            isWon ? 'text-brand-gold' : 'text-brand-danger'
          )}
        >
          {isWon ? '人狼を捕らえた' : '人狼を取り逃がした'}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Day {meta.currentDay} で決着 ・ 村の信頼度 {meta.villageTrust}
        </p>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-card border border-brand-danger/40 bg-brand-danger/15 p-card text-sm text-brand-danger"
        >
          {errorMessage}
        </div>
      )}

      {loading && <p className="text-center text-sm text-brand-muted">真相を集計中…</p>}

      {truthReveal && score && (
        <>
          <section className="flex flex-col items-center gap-card">
            <RankBadge rank={truthReveal.rank} />
          </section>

          <section className="space-y-card">
            <h2 className="font-serif text-xl text-brand-emphasis">プレイ統計</h2>
            <StatsGrid score={score} />
          </section>
        </>
      )}

      <section className="flex flex-wrap justify-center gap-card">
        <Button variant="ghost" onClick={backToTitle}>
          タイトルに戻る
        </Button>
        <Button variant="secondary" onClick={replay}>
          もう一度プレイ
        </Button>
        {truthReveal && (
          <Link
            href={`/play/${gameId}/truth`}
            className="inline-flex items-center justify-center gap-2 rounded-card border border-brand-gold bg-brand-gold/15 px-page py-2 font-serif text-lg text-brand-gold transition hover:bg-brand-gold/25"
          >
            真相を見る →
          </Link>
        )}
      </section>
    </div>
  );
}

function StatsGrid({ score }: { score: ScoreBreakdown }) {
  return (
    <dl className="grid grid-cols-2 gap-card md:grid-cols-4">
      <Stat
        label="人狼特定"
        value={score.werewolfIdentified ? '◯' : '×'}
        highlight={score.werewolfIdentified}
      />
      <Stat label="経過日数" value={`${score.daysElapsed} 日`} />
      <Stat label="誤処刑" value={`${score.wrongExecutions} 件`} bad={score.wrongExecutions > 0} />
      <Stat label="生存村人" value={`${score.survivingVillagers} 人`} />
      <Stat label="尋問効率" value={`${Math.round(score.interrogationEfficiency * 100)}%`} />
      <Stat
        label="矛盾的中"
        value={`${score.correctContradictions}`}
        highlight={score.correctContradictions > 0}
      />
      <Stat
        label="矛盾誤指摘"
        value={`${score.wrongContradictions}`}
        bad={score.wrongContradictions > 0}
      />
      <Stat label="村信頼度" value={`${score.finalVillageTrust}/100`} />
    </dl>
  );
}

function Stat({
  label,
  value,
  highlight,
  bad,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  bad?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-card border border-brand-border bg-brand-surface p-card">
      <dt className="text-xs text-brand-muted">{label}</dt>
      <dd
        className={cn(
          'font-serif text-2xl',
          highlight && 'text-brand-gold',
          bad && 'text-brand-danger',
          !highlight && !bad && 'text-brand-text'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function NotReady({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-card py-section text-center">
      <p className="font-serif text-2xl text-brand-emphasis">結果はまだ表示できません</p>
      <p className="text-sm text-brand-muted">{reason}</p>
      <Link
        href="/"
        className="text-brand-muted underline-offset-2 transition hover:text-brand-gold hover:underline"
      >
        タイトルに戻る
      </Link>
    </div>
  );
}
