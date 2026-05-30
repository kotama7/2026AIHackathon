'use client';

import type { CharacterPublic, EvidenceId, RevealTruthResponse } from '@village/shared';
import Link from 'next/link';
import { use as usePromise, useMemo } from 'react';

import { RankBadge } from '@/components/game/RankBadge';
import { Badge, Card, CardBody, CardHeader, CharacterAvatar, cn } from '@/components/ui';
import { useTruthReveal } from '@/hooks/useTruthReveal';
import { useGameStore } from '@/stores/gameStore';

export default function TruthPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const meta = useGameStore((s) => s.meta);
  const characters = useGameStore((s) => s.characters);
  const trials = useGameStore((s) => s.trials);

  const isGameOver = meta !== null && meta.status !== 'in_progress';
  const { truthReveal, loading, errorMessage } = useTruthReveal(gameId, isGameOver);
  const lastTrial = trials.length > 0 ? trials[trials.length - 1] : null;

  if (!isGameOver) {
    return <NotReady reason="このゲームはまだ終了していません。" />;
  }
  if (loading) {
    return <p className="py-section text-center text-sm text-brand-muted">真相を集計中…</p>;
  }
  if (errorMessage) {
    return (
      <div className="space-y-card py-section text-center">
        <p className="font-serif text-xl text-brand-danger">真相を取得できませんでした</p>
        <p className="text-sm text-brand-muted">{errorMessage}</p>
        <Link
          href={`/play/${gameId}/result`}
          className="text-brand-muted underline hover:text-brand-gold"
        >
          結果に戻る
        </Link>
      </div>
    );
  }
  if (!truthReveal) {
    return <NotReady reason="真相データが取得できていません。" />;
  }

  return (
    <div className="space-y-section">
      <header className="space-y-card">
        <Link
          href={`/play/${gameId}/result`}
          className="text-xs text-brand-muted underline-offset-2 transition hover:text-brand-gold hover:underline"
        >
          ← 結果に戻る
        </Link>
        <h1 className="font-serif text-4xl text-brand-gold">真相開示</h1>
        <p className="max-w-prose text-sm text-brand-muted">{truthReveal.truthSummary}</p>
      </header>

      <PlayerComparison
        truthReveal={truthReveal}
        lastTrial={
          lastTrial
            ? {
                suspectId: lastTrial.suspectId,
                presentedEvidence: lastTrial.presentedEvidence,
                wasCorrect: lastTrial.wasCorrect ?? null,
              }
            : null
        }
      />

      <WerewolfSection werewolf={truthReveal.werewolf} />

      <CharacterRevealsSection
        reveals={truthReveal.characterReveals}
        werewolfId={truthReveal.werewolf.id}
      />

      <LieRevealsSection reveals={truthReveal.lieReveals} characters={characters} />

      <EvidenceRevealsSection reveals={truthReveal.evidenceReveals} />

      <DeductionPathSection path={truthReveal.deductionPath} characters={characters} />

      <section className="flex flex-col items-center gap-card pt-section">
        <RankBadge rank={truthReveal.rank} size="sm" />
        <Link
          href="/"
          className="text-brand-muted underline-offset-2 transition hover:text-brand-gold hover:underline"
        >
          タイトルに戻る
        </Link>
      </section>
    </div>
  );
}

function PlayerComparison({
  truthReveal,
  lastTrial,
}: {
  truthReveal: RevealTruthResponse;
  lastTrial: {
    suspectId: string;
    presentedEvidence: EvidenceId[];
    wasCorrect: boolean | null;
  } | null;
}) {
  if (!lastTrial) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-serif text-xl text-brand-emphasis">あなたの推理</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-brand-muted">裁判を経ずにゲーム終了になりました。</p>
        </CardBody>
      </Card>
    );
  }

  const idealEvidenceIds = useMemo(() => {
    const ids = new Set<EvidenceId>();
    for (const step of truthReveal.deductionPath) {
      for (const id of step.requiredEvidence) ids.add(id);
    }
    return Array.from(ids);
  }, [truthReveal.deductionPath]);

  const hitEvidenceCount = lastTrial.presentedEvidence.filter((id) =>
    idealEvidenceIds.includes(id)
  ).length;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-brand-emphasis">あなたの推理</h2>
        <Badge tone={lastTrial.wasCorrect ? 'success' : 'danger'}>
          {lastTrial.wasCorrect ? '人狼を当てた' : '人狼を逃した'}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-card">
        <Row label="指名した容疑者">
          <span className="text-brand-text">
            {lastTrial.suspectId === truthReveal.werewolf.id ? (
              <span className="text-brand-success">{truthReveal.werewolf.name} (正解)</span>
            ) : (
              <span className="text-brand-danger">{lastTrial.suspectId} (誤り)</span>
            )}
          </span>
        </Row>
        <Row label="提示した証拠">
          <span className="text-brand-text">
            {lastTrial.presentedEvidence.length} 件 (内、推理経路に必要だったもの{' '}
            <strong className="text-brand-gold">{hitEvidenceCount}</strong> /{' '}
            {idealEvidenceIds.length})
          </span>
        </Row>
      </CardBody>
    </Card>
  );
}

function WerewolfSection({ werewolf }: { werewolf: CharacterPublic }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif text-xl text-brand-emphasis">実際の人狼</h2>
      </CardHeader>
      <CardBody className="flex items-start gap-card">
        <CharacterAvatar
          name={werewolf.name}
          seed={werewolf.id}
          size="lg"
          isAlive={werewolf.isAlive}
        />
        <div className="flex flex-col gap-1">
          <p className="font-serif text-2xl text-brand-danger">{werewolf.name}</p>
          <p className="text-xs text-brand-muted">
            {werewolf.socialRole} / {werewolf.publicPersonality}
          </p>
          <p className="text-sm text-brand-text">この村に潜伏していた人狼。</p>
        </div>
      </CardBody>
    </Card>
  );
}

function CharacterRevealsSection({
  reveals,
  werewolfId,
}: {
  reveals: RevealTruthResponse['characterReveals'];
  werewolfId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif text-xl text-brand-emphasis">各キャラの秘密</h2>
      </CardHeader>
      <CardBody className="space-y-2">
        {reveals.map((r) => (
          <details
            key={r.character.id}
            className="rounded-card border border-brand-border bg-brand-bg p-card"
          >
            <summary className="flex cursor-pointer items-center gap-2">
              <CharacterAvatar name={r.character.name} seed={r.character.id} size="sm" />
              <span className="font-serif text-brand-emphasis">{r.character.name}</span>
              {r.character.id === werewolfId && <Badge tone="danger">人狼</Badge>}
            </summary>
            <dl className="mt-card space-y-1 text-sm">
              <dt className="text-xs text-brand-muted">秘密</dt>
              <dd className="text-brand-text">{r.secret}</dd>
              <dt className="text-xs text-brand-muted">私的目的</dt>
              <dd className="text-brand-text">{r.privateGoal}</dd>
              <dt className="text-xs text-brand-muted">恐れていたこと</dt>
              <dd className="text-brand-text">{r.fear}</dd>
            </dl>
          </details>
        ))}
      </CardBody>
    </Card>
  );
}

function LieRevealsSection({
  reveals,
  characters,
}: {
  reveals: RevealTruthResponse['lieReveals'];
  characters: CharacterPublic[];
}) {
  if (reveals.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif text-xl text-brand-emphasis">嘘の理由</h2>
      </CardHeader>
      <CardBody className="space-y-card">
        {reveals.map((r, idx) => {
          const speaker = characters.find((c) => c.id === r.speakerId);
          return (
            <div
              key={`${r.speakerId}-${idx}`}
              className="space-y-2 rounded-card border border-brand-border bg-brand-bg p-card"
            >
              <div className="flex items-center gap-2">
                {speaker && <CharacterAvatar name={speaker.name} seed={speaker.id} size="sm" />}
                <span className="font-serif text-sm text-brand-emphasis">
                  {speaker?.name ?? r.speakerId}
                </span>
              </div>
              <Row label="嘘の内容">
                <span className="text-brand-text">{r.content}</span>
              </Row>
              <Row label="嘘をついた理由">
                <span className="text-brand-muted">{r.reason}</span>
              </Row>
              <Row label="隠したかった真実">
                <span className="text-brand-text">{r.hiddenTruth}</span>
              </Row>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function EvidenceRevealsSection({ reveals }: { reveals: RevealTruthResponse['evidenceReveals'] }) {
  if (reveals.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif text-xl text-brand-emphasis">証拠の真の意味</h2>
      </CardHeader>
      <CardBody className="space-y-2">
        {reveals.map((r) => (
          <div
            key={r.evidence.id}
            className="space-y-1 rounded-card border border-brand-border bg-brand-bg p-card"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-serif text-sm text-brand-emphasis">{r.evidence.name}</p>
              <Badge tone={r.evidence.reliability === 'A' ? 'gold' : 'neutral'}>
                {r.evidence.reliability}
              </Badge>
            </div>
            <p className="text-xs text-brand-muted">{r.evidence.description}</p>
            <Row label="真の意味">
              <span className="text-brand-text">{r.trueInterpretation}</span>
            </Row>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function DeductionPathSection({
  path,
  characters,
}: {
  path: RevealTruthResponse['deductionPath'];
  characters: CharacterPublic[];
}) {
  if (path.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif text-xl text-brand-emphasis">
          推理経路 ({path.length} ステップ)
        </h2>
      </CardHeader>
      <CardBody className="space-y-2">
        {path.map((step) => {
          const coverage =
            step.playerHadAllEvidence && step.playerHadAllTestimonies
              ? 'full'
              : step.playerHadAllEvidence || step.playerHadAllTestimonies
                ? 'partial'
                : 'none';
          return (
            <details
              key={step.step}
              className="rounded-card border border-brand-border bg-brand-bg p-card"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                      coverage === 'full' &&
                        'border-brand-success bg-brand-success/15 text-brand-success',
                      coverage === 'partial' &&
                        'border-brand-gold bg-brand-gold/15 text-brand-gold',
                      coverage === 'none' &&
                        'border-brand-danger bg-brand-danger/15 text-brand-danger'
                    )}
                  >
                    {step.step}
                  </span>
                  <span className="font-serif text-sm text-brand-emphasis">Step {step.step}</span>
                </span>
                <Badge
                  tone={
                    coverage === 'full' ? 'success' : coverage === 'partial' ? 'gold' : 'danger'
                  }
                >
                  {coverage === 'full' ? '全証拠あり' : coverage === 'partial' ? '部分的' : '不足'}
                </Badge>
              </summary>
              <div className="mt-card space-y-2 text-sm">
                <p className="text-brand-text">{step.reasoning}</p>
                <Row label="必要な証拠">
                  {step.requiredEvidence.length > 0 ? (
                    <span className="text-brand-muted">{step.requiredEvidence.join(', ')}</span>
                  ) : (
                    <span className="text-brand-muted">なし</span>
                  )}
                </Row>
                {step.requiredTestimonies.length > 0 && (
                  <Row label="必要な証言">
                    <span className="text-brand-muted">{step.requiredTestimonies.join(', ')}</span>
                  </Row>
                )}
                {step.excludedSuspects.length > 0 && (
                  <Row label="このステップで除外">
                    <span className="flex flex-wrap gap-1">
                      {step.excludedSuspects.map((id) => {
                        const c = characters.find((x) => x.id === id);
                        return (
                          <Badge key={id} tone="neutral">
                            {c?.name ?? id}
                          </Badge>
                        );
                      })}
                    </span>
                  </Row>
                )}
              </div>
            </details>
          );
        })}
      </CardBody>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-2 text-sm">
      <span className="text-xs text-brand-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function NotReady({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-card py-section text-center">
      <p className="font-serif text-2xl text-brand-emphasis">真相はまだ閲覧できません</p>
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
