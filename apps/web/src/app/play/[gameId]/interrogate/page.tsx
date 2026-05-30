'use client';

import type { CharacterPublic, QuestionType, SubmitInterrogationRequest } from '@village/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { use as usePromise, useEffect, useMemo, useState } from 'react';

import { ContradictionPicker } from '@/components/game/ContradictionPicker';
import { EvidencePicker } from '@/components/game/EvidencePicker';
import { QuestionTypePanel } from '@/components/game/QuestionTypePanel';
import { Badge, Button, CharacterAvatar, cn } from '@/components/ui';
import { callSubmitInterrogation, FunctionsApiError } from '@/lib/firebase/functions';
import {
  type InterrogationPublic,
  useAliveCharacters,
  useGameStore,
  useInterrogationsFor,
  useRemainingPoints,
} from '@/stores/gameStore';

export default function InterrogatePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const alive = useAliveCharacters();
  const allChars = useGameStore((s) => s.characters);
  const meta = useGameStore((s) => s.meta);
  const remainingPoints = useRemainingPoints();
  const addInterrogation = useGameStore((s) => s.addInterrogation);
  const setCharacters = useGameStore((s) => s.setCharacters);
  const setMeta = useGameStore((s) => s.setMeta);

  const [targetId, setTargetId] = useState<string | null>(searchParams.get('target'));
  const [questionType, setQuestionType] = useState<QuestionType | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(searchParams.get('evidence'));
  const [contradictionIds, setContradictionIds] = useState<string[]>([]);
  const [evidencePickerOpen, setEvidencePickerOpen] = useState(false);
  const [contradictionPickerOpen, setContradictionPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [trustFlash, setTrustFlash] = useState<{
    targetId: string;
    delta: number;
  } | null>(null);

  const target = useMemo<CharacterPublic | null>(
    () => allChars.find((c) => c.id === targetId) ?? null,
    [allChars, targetId]
  );

  // 証拠提示が選ばれている場合、URL から渡ってきた evidenceId を初期選択にする
  useEffect(() => {
    if (questionType === 'evidence' && evidenceId === null) {
      const urlEv = searchParams.get('evidence');
      if (urlEv) setEvidenceId(urlEv);
    }
  }, [questionType, evidenceId, searchParams]);

  // ターゲット切替時は質問タイプもリセット
  useEffect(() => {
    setQuestionType(null);
    setEvidenceId(searchParams.get('evidence'));
    setContradictionIds([]);
    setError(null);
  }, [targetId, searchParams]);

  const interrogations = useInterrogationsFor(targetId);

  async function execute() {
    if (!target || !questionType || !meta) return;
    setSubmitting(true);
    setError(null);
    const req: SubmitInterrogationRequest = {
      gameId,
      targetId: target.id,
      questionType,
      questionText: '',
      ...(questionType === 'evidence' && evidenceId ? { evidenceId } : {}),
      ...(questionType === 'contradiction' ? { contradictionIds } : {}),
    };

    try {
      const res = await callSubmitInterrogation(req);
      const now = new Date();
      const intr: InterrogationPublic = {
        id: res.interrogationId,
        day: meta.currentDay,
        targetId: target.id,
        questionType,
        questionText: req.questionText ?? '',
        presentedEvidenceId: req.evidenceId,
        presentedContradictionIds: req.contradictionIds,
        cost: meta.remainingPoints - res.remainingPoints,
        answerText: res.answer,
        trustDelta: res.trustDelta,
        createdAt: {
          toDate: () => now,
          toMillis: () => now.getTime(),
          seconds: Math.floor(now.getTime() / 1000),
          nanoseconds: 0,
        },
      };
      addInterrogation(intr);
      // updatedCharacter で trust を反映
      setCharacters(
        allChars.map((c) => (c.id === res.updatedCharacter.id ? res.updatedCharacter : c))
      );
      // remaining points を反映
      setMeta({ ...meta, remainingPoints: res.remainingPoints });
      // trust delta flash
      setTrustFlash({ targetId: target.id, delta: res.trustDelta });
      window.setTimeout(() => setTrustFlash(null), 1800);
      // 入力リセット (target は維持して連続尋問)
      setQuestionType(null);
      setEvidenceId(null);
      setContradictionIds([]);
    } catch (e) {
      setError(
        e instanceof FunctionsApiError
          ? new Error(
              `[${e.code}] ${e.message}${e.code === 'insufficient_points' ? ' (ポイント不足)' : ''}`
            )
          : e instanceof Error
            ? e
            : new Error(String(e))
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-card lg:grid-cols-[16rem_1fr_18rem]">
      <CharacterList
        characters={alive}
        selectedId={targetId}
        onSelect={setTargetId}
        trustFlash={trustFlash}
      />

      <section className="space-y-card">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl text-brand-gold">尋問</h1>
          {target ? (
            <p className="text-sm text-brand-muted">
              対象: <strong className="text-brand-emphasis">{target.name}</strong> ／ 信頼度{' '}
              {target.trustToPlayer}
            </p>
          ) : (
            <p className="text-sm text-brand-muted">左から対象を選んでください</p>
          )}
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-card border border-brand-danger/40 bg-brand-danger/15 p-card text-sm text-brand-danger"
          >
            {error.message}
          </div>
        )}

        {target ? (
          interrogations.length === 0 ? (
            <p className="rounded-card border border-brand-border bg-brand-surface p-page text-sm text-brand-muted">
              {target.name} への尋問はまだありません。
            </p>
          ) : (
            <ol className="flex flex-col gap-card">
              {interrogations.map((intr) => (
                <li key={intr.id}>
                  <InterrogationExchange intr={intr} target={target} />
                </li>
              ))}
            </ol>
          )
        ) : null}
      </section>

      <QuestionTypePanel
        selectedType={questionType}
        onSelectType={setQuestionType}
        remainingPoints={remainingPoints}
        requirement={{
          evidenceSelected: evidenceId !== null,
          contradictionsSelected: contradictionIds.length > 0,
        }}
        onPickEvidence={() => setEvidencePickerOpen(true)}
        onPickContradictions={() => setContradictionPickerOpen(true)}
        onExecute={execute}
        submitting={submitting}
        disabled={!target}
      />

      <EvidencePicker
        open={evidencePickerOpen}
        onClose={() => setEvidencePickerOpen(false)}
        selectedId={evidenceId}
        onSelect={setEvidenceId}
      />
      <ContradictionPicker
        open={contradictionPickerOpen}
        onClose={() => setContradictionPickerOpen(false)}
        selectedIds={contradictionIds}
        onChange={setContradictionIds}
      />

      {/* router 参照を hold (将来 navigation に使う) */}
      <span hidden aria-hidden>
        {router !== null && '_'}
      </span>
    </div>
  );
}

function CharacterList({
  characters,
  selectedId,
  onSelect,
  trustFlash,
}: {
  characters: CharacterPublic[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  trustFlash: { targetId: string; delta: number } | null;
}) {
  return (
    <aside className="space-y-1 rounded-card border border-brand-border bg-brand-surface p-card">
      <h2 className="text-xs font-semibold text-brand-muted">対象 (生存)</h2>
      <ul className="flex flex-col gap-1">
        {characters.map((c) => {
          const selected = c.id === selectedId;
          const flashing = trustFlash?.targetId === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-card border px-2 py-1.5 text-left transition',
                  selected
                    ? 'border-brand-gold bg-brand-gold/15'
                    : 'border-brand-border hover:bg-brand-bg'
                )}
              >
                <CharacterAvatar name={c.name} seed={c.id} size="sm" isAlive={c.isAlive} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-serif text-sm text-brand-text">{c.name}</span>
                  <span className="flex items-center gap-1 text-xs">
                    <TrustBar value={c.trustToPlayer} />
                    {flashing && trustFlash && (
                      <span
                        className={cn(
                          'animate-fade-in font-semibold',
                          trustFlash.delta >= 0 ? 'text-brand-success' : 'text-brand-danger'
                        )}
                      >
                        {trustFlash.delta >= 0 ? '+' : ''}
                        {trustFlash.delta}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function TrustBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 60 ? 'bg-brand-success' : v >= 30 ? 'bg-brand-gold' : 'bg-brand-danger';
  return (
    <span className="flex items-center gap-1 text-brand-muted">
      <span className="block h-1 w-12 overflow-hidden rounded-full bg-brand-border">
        <span
          className={cn('block h-full transition-[width] duration-300', tone)}
          style={{ width: `${v}%` }}
        />
      </span>
      <span className="font-mono text-[10px]">{v}</span>
    </span>
  );
}

const QUESTION_LABEL_SHORT: Record<QuestionType, string> = {
  normal: '通常',
  deep_dive: '深掘り',
  evidence: '証拠',
  contradiction: '矛盾',
  force_testimony: '強制',
};

function InterrogationExchange({
  intr,
  target,
}: {
  intr: InterrogationPublic;
  target: CharacterPublic;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-brand-border bg-brand-surface p-card">
      <div className="flex items-center gap-2 text-xs">
        <Badge tone="gold">{QUESTION_LABEL_SHORT[intr.questionType]}</Badge>
        <span className="text-brand-muted">
          Day {intr.day} ・ −{intr.cost}pt
        </span>
        <span
          className={cn(
            'ml-auto font-semibold',
            intr.trustDelta >= 0 ? 'text-brand-success' : 'text-brand-danger'
          )}
        >
          信頼 {intr.trustDelta >= 0 ? '+' : ''}
          {intr.trustDelta}
        </span>
      </div>
      <div className="flex gap-2">
        <CharacterAvatar name={target.name} seed={target.id} size="md" />
        <p className="flex-1 whitespace-pre-wrap leading-relaxed text-brand-text">
          {intr.answerText}
        </p>
      </div>
    </div>
  );
}
