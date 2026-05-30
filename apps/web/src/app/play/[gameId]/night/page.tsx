'use client';

import type { CharacterPublic } from '@village/shared';
import { useRouter } from 'next/navigation';
import { use as usePromise, useState } from 'react';

import { Badge, Button, CharacterAvatar, cn, Modal } from '@/components/ui';
import { callSubmitNightAction, FunctionsApiError } from '@/lib/firebase/functions';
import { useAliveCharacters, useGameStore } from '@/stores/gameStore';

type Stage = 'pick' | 'confirm' | 'transitioning' | 'result';

const TRANSITION_MS = 5000;

export default function NightPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const router = useRouter();
  const alive = useAliveCharacters();
  const meta = useGameStore((s) => s.meta);
  const setMeta = useGameStore((s) => s.setMeta);
  const setLogs = useGameStore((s) => s.setLogs);
  const logs = useGameStore((s) => s.logs);
  const setEvidence = useGameStore((s) => s.setEvidence);
  const evidence = useGameStore((s) => s.evidence);
  const [selected, setSelected] = useState<CharacterPublic | null>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<{
    watchResult: string;
    gameOver: boolean;
  } | null>(null);

  async function confirm() {
    if (!selected || !meta) return;
    setError(null);
    setStage('transitioning');
    const transitionPromise = new Promise((r) => setTimeout(r, TRANSITION_MS));

    try {
      const [res] = await Promise.all([
        callSubmitNightAction({
          gameId,
          day: meta.currentDay,
          watchTargetId: selected.id,
        }),
        transitionPromise,
      ]);
      // 翌朝データをストアに反映
      const newLogs = [...logs, ...res.nextDayLogs];
      const newEvidence = [...evidence, ...res.nextDayEvidence];
      setLogs(newLogs);
      setEvidence(newEvidence);
      setMeta({
        ...meta,
        currentDay: res.gameOver ? meta.currentDay : ((meta.currentDay + 1) as 1 | 2 | 3),
        currentPhase: res.gameOver ? 'result' : 'morning',
        status: res.gameOver ? (res.finalStatus ?? 'lost_werewolf_survived') : 'in_progress',
        remainingPoints: 5,
      });
      setResult({ watchResult: res.watchResult, gameOver: res.gameOver });
      setStage('result');
    } catch (e) {
      setError(
        e instanceof FunctionsApiError
          ? new Error(`[${e.code}] ${e.message}`)
          : e instanceof Error
            ? e
            : new Error(String(e))
      );
      setStage('confirm');
    }
  }

  function goToMorning() {
    if (!meta) return;
    router.push(result?.gameOver ? `/play/${gameId}/result` : `/play/${gameId}/discussion`);
  }

  return (
    <div className="space-y-section">
      <header className="space-y-card">
        <h1 className="font-serif text-3xl text-brand-gold">夜フェーズ</h1>
        <p className="text-sm text-brand-muted">
          生存している住民から 1
          人を選び、夜の間その人物を監視します。監視結果は翌朝に確認できます。
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-card border border-brand-danger/40 bg-brand-danger/15 p-card text-sm text-brand-danger"
        >
          {error.message}
        </div>
      )}

      <section className="space-y-card">
        <h2 className="text-sm text-brand-muted">監視対象 ({alive.length} 人中 1 人選択)</h2>
        <div className="grid grid-cols-2 gap-card md:grid-cols-3">
          {alive.map((c) => {
            const isSelected = selected?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                disabled={stage !== 'pick'}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-card border bg-brand-surface p-card text-left transition',
                  isSelected
                    ? 'border-brand-gold ring-2 ring-brand-gold/40'
                    : 'border-brand-border hover:border-brand-gold/50',
                  stage !== 'pick' && 'cursor-not-allowed opacity-60'
                )}
              >
                <CharacterAvatar name={c.name} seed={c.id} size="lg" />
                <span className="font-serif text-brand-emphasis">{c.name}</span>
                <span className="text-xs text-brand-muted">{c.socialRole}</span>
                <Badge tone={isSelected ? 'gold' : 'neutral'}>
                  {isSelected ? '監視対象' : '選択する'}
                </Badge>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          variant="primary"
          disabled={!selected || stage !== 'pick'}
          onClick={() => setStage('confirm')}
          size="lg"
        >
          監視を確定する
        </Button>
      </div>

      <Modal
        open={stage === 'confirm'}
        onOpenChange={(o) => !o && stage === 'confirm' && setStage('pick')}
        dismissible
        title="この対象で確定しますか？"
        description={
          selected
            ? `${selected.name} を夜の間監視します。確定後は変更できません。`
            : '対象が選択されていません'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setStage('pick')}>
              選び直す
            </Button>
            <Button onClick={confirm}>確定する</Button>
          </>
        }
      >
        {selected && (
          <div className="flex items-center gap-card">
            <CharacterAvatar name={selected.name} seed={selected.id} size="lg" />
            <div>
              <p className="font-serif text-lg text-brand-emphasis">{selected.name}</p>
              <p className="text-xs text-brand-muted">
                {selected.socialRole} / 信頼度 {selected.trustToPlayer}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {stage === 'transitioning' && <NightTransition />}

      <Modal
        open={stage === 'result' && result !== null}
        onOpenChange={(o) => !o && goToMorning()}
        dismissible={false}
        title={result?.gameOver ? '夜が明ける… (最終日)' : '夜が明けた'}
        description={selected ? `${selected.name} を監視した結果` : undefined}
        footer={
          <Button onClick={goToMorning}>{result?.gameOver ? '結果を見る' : '議論を始める'}</Button>
        }
      >
        {result && (
          <p className="whitespace-pre-wrap leading-relaxed text-brand-text">
            {result.watchResult}
          </p>
        )}
      </Modal>
    </div>
  );
}

function NightTransition() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-card text-center">
        <span
          aria-hidden
          className="text-6xl text-brand-gold"
          style={{
            animation: 'fade-in 1.2s ease-out infinite alternate',
          }}
        >
          🌙
        </span>
        <p className="font-serif text-2xl text-brand-emphasis">夜が更けていく…</p>
        <p className="text-sm text-brand-muted">監視結果を集めています</p>
      </div>
    </div>
  );
}
