'use client';

import type { CharacterPublic, GamePhase } from '@village/shared';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { use as usePromise } from 'react';

import { CharacterProfileModal } from '@/components/game/CharacterProfileModal';
import { Badge, Card, CardBody, CardHeader, CharacterAvatar } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';

/** 進め方ガイド: 目的と1日の流れ、今やるべきことを明示する。 */
function GuidePanel({ gameId, phase }: { gameId: string; phase: GamePhase | null }) {
  const steps: { key: string; label: string; href?: string; phases: GamePhase[] }[] = [
    {
      key: 'discussion',
      label: '① 議論ログを読む',
      href: `/play/${gameId}/discussion`,
      phases: [],
    },
    { key: 'evidence', label: '② 証拠を調べる', href: `/play/${gameId}/evidence`, phases: [] },
    { key: 'pins', label: '③ 怪しい発言/証拠をピンする', href: `/play/${gameId}/pins`, phases: [] },
    {
      key: 'interrogate',
      label: '④ 尋問で住民を問い詰める',
      href: `/play/${gameId}/interrogate`,
      phases: ['investigation'],
    },
    {
      key: 'trial',
      label: '⑤ 裁判で人狼を告発する',
      href: `/play/${gameId}/trial`,
      phases: ['trial'],
    },
    {
      key: 'night',
      label: '⑥ 夜の結果を確認する',
      href: `/play/${gameId}/night`,
      phases: ['night'],
    },
  ];
  return (
    <Card className="border-brand-gold/40">
      <CardHeader>
        <h2 className="font-serif text-lg text-brand-gold">▶ 進め方ガイド</h2>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        <p className="text-brand-text">
          目的: AIキャラの<strong>議論・証拠・証言</strong>から<strong>人狼（嘘をつく者）</strong>
          を見抜き、裁判で正しく告発する一人用推理ゲームです。
        </p>
        <ol className="space-y-1">
          {steps.map((s) => {
            const available = s.phases.length === 0 || (phase !== null && s.phases.includes(phase));
            return (
              <li key={s.key} className="flex items-center gap-2">
                {available && s.href ? (
                  <Link
                    href={s.href}
                    className="text-brand-emphasis underline-offset-2 hover:text-brand-gold hover:underline"
                  >
                    {s.label}
                  </Link>
                ) : (
                  <span className="text-brand-muted">{s.label}</span>
                )}
                {!available && (
                  <span className="rounded bg-brand-bg px-1.5 py-0.5 text-[10px] text-brand-muted">
                    {s.phases.map((p) => PHASE_LABEL[p]).join('/')}フェーズで解放
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-brand-muted">
          まずは <strong>①議論</strong> と <strong>②証拠</strong> を読み、気になる点を{' '}
          <strong>③ピン</strong> して手がかりを整理しましょう。
        </p>
      </CardBody>
    </Card>
  );
}

const PHASE_LABEL: Record<GamePhase, string> = {
  morning: '朝',
  discussion: '議論',
  investigation: '調査',
  organize: '整理',
  trial: '裁判',
  night: '夜',
  result: '終了',
};

export default function PlayHomePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const characters = useGameStore((s) => s.characters);
  const logs = useGameStore((s) => s.logs);
  const meta = useGameStore((s) => s.meta);
  const [selected, setSelected] = useState<CharacterPublic | null>(null);

  // 朝アナウンス相当のログ (event 紹介)
  const morningLog = useMemo(
    () => logs.find((l) => l.phase === 'morning' && l.day === (meta?.currentDay ?? 1)),
    [logs, meta?.currentDay]
  );

  if (characters.length === 0) {
    return <EmptyState gameId={gameId} />;
  }

  return (
    <div className="space-y-section">
      <GuidePanel gameId={gameId} phase={meta?.currentPhase ?? null} />
      <header className="space-y-card">
        <h1 className="font-serif text-4xl text-brand-gold">村の概要</h1>
        {morningLog ? (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-brand-emphasis">事件概要</h2>
              <Badge tone="danger">Day {morningLog.day}</Badge>
            </CardHeader>
            <CardBody>
              <p className="whitespace-pre-wrap leading-relaxed text-brand-text">
                {morningLog.text}
              </p>
            </CardBody>
          </Card>
        ) : (
          <p className="text-sm text-brand-muted">事件の概要はまだ発表されていません。</p>
        )}
      </header>

      <section className="space-y-card">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl text-brand-emphasis">住民 ({characters.length})</h2>
          <p className="text-xs text-brand-muted">カードをクリックでプロフィール</p>
        </div>
        <div className="grid grid-cols-2 gap-card md:grid-cols-3">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} onClick={() => setSelected(c)} />
          ))}
        </div>
      </section>

      <CharacterProfileModal
        character={selected}
        onClose={() => setSelected(null)}
        gameId={gameId}
      />
    </div>
  );
}

function CharacterCard({
  character,
  onClick,
}: {
  character: CharacterPublic;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-card rounded-card border border-brand-border bg-brand-surface p-card text-left transition hover:border-brand-gold/50 hover:bg-brand-surface/80 disabled:opacity-50"
    >
      <CharacterAvatar
        name={character.name}
        seed={character.id}
        size="lg"
        isAlive={character.isAlive}
      />
      <div className="w-full space-y-1 text-center">
        <p className="font-serif text-lg text-brand-emphasis">{character.name}</p>
        <p className="text-xs text-brand-muted">{character.socialRole}</p>
        <p className="line-clamp-2 text-xs text-brand-text">{character.publicPersonality}</p>
      </div>
      <div className="flex items-center gap-1 text-xs">
        {character.isAlive ? <Badge tone="success">生存</Badge> : <Badge tone="danger">脱落</Badge>}
        <span className="text-brand-muted">信頼 {character.trustToPlayer}</span>
      </div>
    </button>
  );
}

function EmptyState({ gameId }: { gameId: string }) {
  return (
    <div className="flex flex-col items-center gap-card py-section text-center">
      <p className="font-serif text-2xl text-brand-emphasis">ゲームが見つかりません</p>
      <p className="text-sm text-brand-muted">
        gameId: <code>{gameId}</code>
        <br />
        タイトル画面から新規ゲームを開始してください。
      </p>
    </div>
  );
}
