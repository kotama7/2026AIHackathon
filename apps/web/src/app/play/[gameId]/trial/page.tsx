'use client';

import type {
  CharacterId,
  CharacterPublic,
  EvidenceId,
  EvidencePublic,
  TrialDecision,
  Verdict,
} from '@village/shared';
import { useRouter } from 'next/navigation';
import { use as usePromise, useEffect, useMemo, useState } from 'react';

import { Badge, Button, CharacterAvatar, cn } from '@/components/ui';
import { callSubmitTrialDecision, FunctionsApiError } from '@/lib/firebase/functions';
import { describeError } from '@/lib/functionsErrorMessages';
import {
  type ClientTrialDecision,
  type ContradictionDraft,
  useAliveCharacters,
  useGameStore,
} from '@/stores/gameStore';

type Step = 'suspect' | 'evidence' | 'contradiction' | 'verdict' | 'playing' | 'done';

const STEPS_ORDER: Step[] = ['suspect', 'evidence', 'contradiction', 'verdict'];
const MAX_EVIDENCE = 3;
const MAX_CONTRADICTIONS = 2;
const REACTION_REVEAL_MS = 1500;
const FIRST_REACTION_DELAY_MS = 2200;
const DONE_DELAY_MS = 1200;

const STEP_LABELS: Record<Step, string> = {
  suspect: '容疑者',
  evidence: '証拠',
  contradiction: '矛盾',
  verdict: '判決',
  playing: '弁明',
  done: '結果',
};

const STANCE_TONE: Record<
  TrialDecision['reactions'][number]['stance'],
  'gold' | 'danger' | 'neutral'
> = {
  support: 'gold',
  oppose: 'danger',
  neutral: 'neutral',
};

const STANCE_LABEL: Record<TrialDecision['reactions'][number]['stance'], string> = {
  support: '支持',
  oppose: '反対',
  neutral: '中立',
};

export default function TrialPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const router = useRouter();

  const alive = useAliveCharacters();
  const allChars = useGameStore((s) => s.characters);
  const evidence = useGameStore((s) => s.evidence);
  const contradictions = useGameStore((s) => s.contradictions);
  const meta = useGameStore((s) => s.meta);
  const setMeta = useGameStore((s) => s.setMeta);
  const addTrial = useGameStore((s) => s.addTrial);

  const [step, setStep] = useState<Step>('suspect');
  const [suspectId, setSuspectId] = useState<CharacterId | null>(null);
  const [presentedEvidence, setPresentedEvidence] = useState<EvidenceId[]>([]);
  const [presentedContradictions, setPresentedContradictions] = useState<string[]>([]);
  const [defense, setDefense] = useState<string | null>(null);
  const [reactions, setReactions] = useState<TrialDecision['reactions']>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [outcome, setOutcome] = useState<'continue' | 'won' | 'lost' | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suspect = useMemo<CharacterPublic | null>(
    () => allChars.find((c) => c.id === suspectId) ?? null,
    [allChars, suspectId]
  );

  // playing → 順次フェードイン → done へ自動遷移
  useEffect(() => {
    if (step !== 'playing') return;
    if (revealedCount < reactions.length) {
      const delay = revealedCount === 0 ? FIRST_REACTION_DELAY_MS : REACTION_REVEAL_MS;
      const timer = setTimeout(() => setRevealedCount((c) => c + 1), delay);
      return () => clearTimeout(timer);
    }
    // 全反応見せ終わった
    const timer = setTimeout(() => setStep('done'), DONE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step, revealedCount, reactions.length]);

  const toggleEvidence = (id: EvidenceId) => {
    setPresentedEvidence((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_EVIDENCE) return prev;
      return [...prev, id];
    });
  };
  const toggleContradiction = (id: string) => {
    setPresentedContradictions((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CONTRADICTIONS) return prev;
      return [...prev, id];
    });
  };

  async function submit(verdict: Verdict) {
    if (!suspectId || !meta) return;
    setError(null);
    setStep('playing');
    setRevealedCount(0);

    try {
      const res = await callSubmitTrialDecision({
        gameId,
        day: meta.currentDay,
        suspectId,
        presentedEvidence,
        presentedContradictions,
        verdict,
      });

      const now = new Date();
      const trial: ClientTrialDecision = {
        // doc id は Functions 側 (userDb.trials.set) と揃える: `day${day}`
        id: `day${meta.currentDay}`,
        day: meta.currentDay,
        suspectId,
        presentedEvidence,
        presentedContradictions,
        verdict,
        wasCorrect: res.wasCorrect,
        defenseText: res.defense,
        reactions: res.reactions,
        outcome: res.outcome,
        createdAt: {
          toDate: () => now,
          toMillis: () => now.getTime(),
          seconds: Math.floor(now.getTime() / 1000),
          nanoseconds: 0,
        },
      };
      addTrial(trial);

      // outcome に応じて meta も更新 (mock では meta を自前で動かす必要がある)
      if (res.outcome === 'won' || res.outcome === 'lost') {
        setMeta({
          ...meta,
          currentPhase: 'result',
          status: res.finalStatus ?? (res.outcome === 'won' ? 'won' : 'lost_werewolf_survived'),
        });
      } else {
        setMeta({ ...meta, currentPhase: 'night' });
      }

      setDefense(res.defense);
      setReactions(res.reactions);
      setOutcome(res.outcome);
      setWasCorrect(res.wasCorrect ?? null);
    } catch (e) {
      const msg =
        e instanceof FunctionsApiError ? `[${e.code}] ${e.message}` : describeError(e).user;
      setError(msg);
      setStep('verdict');
    }
  }

  function goToOutcome() {
    if (outcome === 'continue') {
      router.push(`/play/${gameId}/night`);
    } else {
      router.push(`/play/${gameId}/result`);
    }
  }

  function canAdvance(): boolean {
    if (step === 'suspect') return suspectId !== null;
    if (step === 'evidence') return true; // 0 件提示も可
    if (step === 'contradiction') return true; // 0 件可
    return false;
  }

  function next() {
    const idx = STEPS_ORDER.indexOf(step);
    if (idx >= 0 && idx < STEPS_ORDER.length - 1) {
      setStep(STEPS_ORDER[idx + 1] ?? step);
    }
  }
  function back() {
    const idx = STEPS_ORDER.indexOf(step);
    if (idx > 0) setStep(STEPS_ORDER[idx - 1] ?? step);
  }

  return (
    <div className="space-y-section">
      <header className="space-y-card">
        <h1 className="font-serif text-3xl text-brand-gold">裁判</h1>
        <StepIndicator step={step} />
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-card border border-brand-danger/40 bg-brand-danger/15 p-card text-sm text-brand-danger"
        >
          {error}
        </div>
      )}

      {step === 'suspect' && (
        <StepSuspect alive={alive} suspectId={suspectId} onSelect={setSuspectId} />
      )}
      {step === 'evidence' && (
        <StepEvidence evidence={evidence} selected={presentedEvidence} onToggle={toggleEvidence} />
      )}
      {step === 'contradiction' && (
        <StepContradiction
          contradictions={contradictions}
          selected={presentedContradictions}
          onToggle={toggleContradiction}
        />
      )}
      {step === 'verdict' && (
        <StepVerdict
          suspect={suspect}
          presentedEvidence={presentedEvidence.map(
            (id) => evidence.find((e) => e.id === id) ?? null
          )}
          presentedContradictions={presentedContradictions
            .map((id) => contradictions.find((c) => c.id === id) ?? null)
            .filter((c): c is ContradictionDraft => c !== null)}
          onSubmit={submit}
          onBack={back}
        />
      )}
      {step === 'playing' && (
        <StepPlaying
          suspect={suspect}
          defense={defense}
          reactions={reactions.slice(0, revealedCount)}
          totalReactions={reactions.length}
          allChars={allChars}
        />
      )}
      {step === 'done' && (
        <StepDone
          outcome={outcome}
          wasCorrect={wasCorrect}
          suspect={suspect}
          onNext={goToOutcome}
        />
      )}

      {/* 通常 step のナビ (verdict 以降は内蔵ボタン) */}
      {(step === 'suspect' || step === 'evidence' || step === 'contradiction') && (
        <div className="flex items-center justify-between gap-card">
          <Button variant="ghost" onClick={back} disabled={step === 'suspect'}>
            ← 戻る
          </Button>
          <Button onClick={next} disabled={!canAdvance()}>
            次へ →
          </Button>
        </div>
      )}
    </div>
  );
}

/* ===== Step components ===== */

function StepIndicator({ step }: { step: Step }) {
  const visible: Step[] = ['suspect', 'evidence', 'contradiction', 'verdict', 'playing'];
  const currentIdx = visible.indexOf(step === 'done' ? 'playing' : step);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {visible.map((s, i) => {
        const active = i === currentIdx;
        const completed = i < currentIdx;
        return (
          <li key={s} className="flex items-center gap-1">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-[10px]',
                active && 'border-brand-gold bg-brand-gold/15 text-brand-gold',
                completed && 'border-brand-success bg-brand-success/15 text-brand-success',
                !active && !completed && 'border-brand-border text-brand-muted'
              )}
            >
              {completed ? '✓' : i + 1}
            </span>
            <span
              className={cn(
                active ? 'text-brand-gold' : completed ? 'text-brand-success' : 'text-brand-muted'
              )}
            >
              {STEP_LABELS[s]}
            </span>
            {i < visible.length - 1 && (
              <span aria-hidden className="mx-1 text-brand-border">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepSuspect({
  alive,
  suspectId,
  onSelect,
}: {
  alive: CharacterPublic[];
  suspectId: CharacterId | null;
  onSelect: (id: CharacterId) => void;
}) {
  return (
    <section className="space-y-card">
      <p className="text-sm text-brand-muted">
        容疑者を 1 人選んでください。誤った処刑は村の信頼度を大きく下げます。
      </p>
      <div className="grid grid-cols-2 gap-card md:grid-cols-3">
        {alive.map((c) => {
          const selected = c.id === suspectId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-card border bg-brand-surface p-card transition',
                selected
                  ? 'border-brand-danger ring-2 ring-brand-danger/40'
                  : 'border-brand-border hover:border-brand-danger/50'
              )}
            >
              <CharacterAvatar name={c.name} seed={c.id} size="lg" />
              <span className="font-serif text-brand-emphasis">{c.name}</span>
              <span className="text-xs text-brand-muted">{c.socialRole}</span>
              <Badge tone={selected ? 'danger' : 'neutral'}>{selected ? '被告' : '選択する'}</Badge>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StepEvidence({
  evidence,
  selected,
  onToggle,
}: {
  evidence: EvidencePublic[];
  selected: EvidenceId[];
  onToggle: (id: EvidenceId) => void;
}) {
  const limitHit = selected.length >= MAX_EVIDENCE;
  return (
    <section className="space-y-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-muted">
          提示する証拠を最大 {MAX_EVIDENCE} 件選択 (現在 {selected.length} 件)
        </p>
        {limitHit && <Badge tone="gold">上限に達しています</Badge>}
      </div>
      {evidence.length === 0 ? (
        <p className="rounded-card border border-brand-border bg-brand-surface p-page text-sm text-brand-muted">
          証拠がありません。
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {evidence.map((ev) => {
            const checked = selected.includes(ev.id);
            const disabled = !checked && limitHit;
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onToggle(ev.id)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-card border bg-brand-surface p-card text-left transition',
                    checked
                      ? 'border-brand-gold ring-1 ring-brand-gold/40'
                      : 'border-brand-border hover:border-brand-gold/50',
                    disabled && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-brand-gold bg-brand-gold text-brand-bg'
                        : 'border-brand-border'
                    )}
                  >
                    {checked && '✓'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-serif text-sm text-brand-emphasis">{ev.name}</span>
                      <Badge tone={ev.reliability === 'A' ? 'gold' : 'neutral'}>
                        {ev.reliability}
                      </Badge>
                    </span>
                    <span className="line-clamp-2 text-xs text-brand-muted">{ev.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StepContradiction({
  contradictions,
  selected,
  onToggle,
}: {
  contradictions: ContradictionDraft[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const limitHit = selected.length >= MAX_CONTRADICTIONS;
  return (
    <section className="space-y-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-muted">
          矛盾候補を最大 {MAX_CONTRADICTIONS} 件選択 (現在 {selected.length} 件)
        </p>
        {limitHit && <Badge tone="gold">上限に達しています</Badge>}
      </div>
      {contradictions.length === 0 ? (
        <p className="rounded-card border border-brand-border bg-brand-surface p-page text-sm text-brand-muted">
          矛盾候補がありません。ピン整理画面で作成してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {contradictions.map((c) => {
            const checked = selected.includes(c.id);
            const disabled = !checked && limitHit;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onToggle(c.id)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-card border bg-brand-surface p-card text-left transition',
                    checked
                      ? 'border-brand-gold ring-1 ring-brand-gold/40'
                      : 'border-brand-border hover:border-brand-gold/50',
                    disabled && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-brand-gold bg-brand-gold text-brand-bg'
                        : 'border-brand-border'
                    )}
                  >
                    {checked && '✓'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-serif text-sm text-brand-text">
                      {c.note || '(メモ無し)'}
                    </span>
                    <span className="text-xs text-brand-muted">ピン {c.pinIds.length} 件</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StepVerdict({
  suspect,
  presentedEvidence,
  presentedContradictions,
  onSubmit,
  onBack,
}: {
  suspect: CharacterPublic | null;
  presentedEvidence: (EvidencePublic | null)[];
  presentedContradictions: ContradictionDraft[];
  onSubmit: (verdict: Verdict) => void;
  onBack: () => void;
}) {
  return (
    <section className="space-y-card">
      <div className="rounded-card border border-brand-border bg-brand-surface p-page">
        <h2 className="font-serif text-xl text-brand-emphasis">提出内容の確認</h2>
        <div className="mt-card space-y-card text-sm">
          <SummaryRow label="容疑者">
            {suspect ? (
              <span className="flex items-center gap-2">
                <CharacterAvatar name={suspect.name} seed={suspect.id} size="sm" />
                <span className="font-serif text-brand-emphasis">{suspect.name}</span>
              </span>
            ) : (
              <span className="text-brand-muted">未選択</span>
            )}
          </SummaryRow>
          <SummaryRow label={`証拠 (${presentedEvidence.length})`}>
            {presentedEvidence.length === 0 ? (
              <span className="text-brand-muted">提示しない</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {presentedEvidence.map(
                  (e, i) =>
                    e && (
                      <li key={e.id} className="text-brand-text">
                        {i + 1}. {e.name}{' '}
                        <Badge tone={e.reliability === 'A' ? 'gold' : 'neutral'}>
                          {e.reliability}
                        </Badge>
                      </li>
                    )
                )}
              </ul>
            )}
          </SummaryRow>
          <SummaryRow label={`矛盾 (${presentedContradictions.length})`}>
            {presentedContradictions.length === 0 ? (
              <span className="text-brand-muted">提示しない</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {presentedContradictions.map((c) => (
                  <li key={c.id} className="text-brand-text">
                    {c.note || `(無題、ピン ${c.pinIds.length}件)`}
                  </li>
                ))}
              </ul>
            )}
          </SummaryRow>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-card">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        <div className="flex gap-card">
          <Button variant="secondary" onClick={() => onSubmit('hold')}>
            判決保留
          </Button>
          <Button variant="danger" onClick={() => onSubmit('execute')} disabled={!suspect}>
            処刑する
          </Button>
        </div>
      </div>
      <p className="text-xs text-brand-muted">
        判決は確定すると変更できません。保留すると当日の処刑は無し、夜フェーズへ移行します。
      </p>
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-start gap-card">
      <span className="text-xs text-brand-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function StepPlaying({
  suspect,
  defense,
  reactions,
  totalReactions,
  allChars,
}: {
  suspect: CharacterPublic | null;
  defense: string | null;
  reactions: TrialDecision['reactions'];
  totalReactions: number;
  allChars: CharacterPublic[];
}) {
  return (
    <section className="space-y-card">
      {defense && suspect && (
        <article className="animate-fade-in rounded-card border border-brand-danger/40 bg-brand-surface p-page shadow-card">
          <div className="flex items-start gap-card">
            <CharacterAvatar name={suspect.name} seed={suspect.id} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-serif text-brand-emphasis">{suspect.name} の弁明</span>
                <Badge tone="danger">被告</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-brand-text">{defense}</p>
            </div>
          </div>
        </article>
      )}

      <h3 className="text-xs text-brand-muted">
        他住民の反応 ({reactions.length}/{totalReactions})
      </h3>
      <ul className="flex flex-col gap-2">
        {reactions.map((r) => {
          const char = allChars.find((c) => c.id === r.characterId);
          return (
            <li
              key={r.characterId}
              className="animate-fade-in flex items-start gap-card rounded-card border border-brand-border bg-brand-surface p-card"
            >
              {char && <CharacterAvatar name={char.name} seed={char.id} size="md" />}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm text-brand-emphasis">
                    {char?.name ?? r.characterId}
                  </span>
                  <Badge tone={STANCE_TONE[r.stance]}>{STANCE_LABEL[r.stance]}</Badge>
                </div>
                <p className="text-sm text-brand-text">{r.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {reactions.length < totalReactions && (
        <p className="flex items-center gap-2 text-xs text-brand-muted">
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold"
              style={{ animationDelay: '0.3s' }}
            />
          </span>
          反応を集計中…
        </p>
      )}
    </section>
  );
}

function StepDone({
  outcome,
  wasCorrect,
  suspect,
  onNext,
}: {
  outcome: 'continue' | 'won' | 'lost' | null;
  wasCorrect: boolean | null;
  suspect: CharacterPublic | null;
  onNext: () => void;
}) {
  if (!outcome) return null;
  const title =
    outcome === 'won'
      ? '裁判は決着しました'
      : outcome === 'lost'
        ? '裁判は決着しました'
        : '判決は保留されました';
  const tone = outcome === 'won' ? 'success' : outcome === 'lost' ? 'danger' : 'gold';
  const body =
    outcome === 'won'
      ? `あなたは真犯人を見抜きました。${suspect ? `処刑された ${suspect.name} は人狼でした。` : ''}`
      : outcome === 'lost'
        ? `処刑された${suspect ? ` ${suspect.name}` : ''} は無実でした。村の信頼は崩れ、人狼は野放しになりました。`
        : '今日は処刑を見送りました。夜フェーズに進んでください。';
  return (
    <section className="space-y-card">
      <div className="animate-fade-in rounded-card border border-brand-border bg-brand-surface p-page text-center shadow-card">
        <Badge tone={tone}>
          {outcome === 'continue' ? '判決保留' : wasCorrect ? '正解' : '誤判決'}
        </Badge>
        <h2 className="mt-2 font-serif text-2xl text-brand-emphasis">{title}</h2>
        <p className="mt-2 max-w-prose text-sm text-brand-muted mx-auto">{body}</p>
        <div className="mt-section">
          <Button onClick={onNext} size="lg">
            {outcome === 'continue' ? '夜フェーズへ' : '結果を見る →'}
          </Button>
        </div>
      </div>
    </section>
  );
}
