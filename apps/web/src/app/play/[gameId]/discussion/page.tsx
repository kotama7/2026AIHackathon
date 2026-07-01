'use client';

import type { CharacterPublic, DialogueLog, GameDay } from '@village/shared';
import { use as usePromise, useEffect, useMemo, useRef, useState } from 'react';

import { CharacterProfileModal } from '@/components/game/CharacterProfileModal';
import { usePinToggle } from '@/components/game/usePinToggle';
import { Badge, cn, LogBubble } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';

const DAYS: GameDay[] = [1, 2, 3];

const BUBBLE_INTENT: Record<
  DialogueLog['intent'],
  React.ComponentProps<typeof LogBubble>['intent']
> = {
  accuse: 'accuse',
  defend: 'defend',
  suspicion: 'suspicion',
  observation: 'statement',
  question: 'question',
  agree: 'agreement',
  disagree: 'suspicion',
  evasive: 'statement',
};

export default function DiscussionPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const logs = useGameStore((s) => s.logs);
  const characters = useGameStore((s) => s.characters);
  const meta = useGameStore((s) => s.meta);
  const [selectedDay, setSelectedDay] = useState<GameDay>((meta?.currentDay ?? 1) as GameDay);
  const [profileChar, setProfileChar] = useState<CharacterPublic | null>(null);
  const { isPinned, toggle } = usePinToggle();
  const listRef = useRef<HTMLOListElement | null>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const prevCountRef = useRef(0);

  const charLookup = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);

  const dayLogs = useMemo(
    () =>
      logs
        .filter((l) => l.day === selectedDay)
        .slice()
        .sort((a, b) => a.turn - b.turn),
    [logs, selectedDay]
  );

  const logCountsByDay = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const l of logs) counts[l.day] = (counts[l.day] ?? 0) + 1;
    return counts;
  }, [logs]);

  // ログ件数が増えたら下に追従 (フォロー中のみ)
  useEffect(() => {
    if (dayLogs.length > prevCountRef.current && followLatest) {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevCountRef.current = dayLogs.length;
  }, [dayLogs.length, followLatest]);

  // 議論フェーズ中か (新発言を期待できるか)
  const isDiscussing = meta?.currentPhase === 'discussion' && meta?.currentDay === selectedDay;
  const isDiscussionEnded = meta && selectedDay < meta.currentDay; // 過去の日付は議論終了
  const ownerOfLatestPhase =
    meta && selectedDay === meta.currentDay && meta.currentPhase !== 'discussion';

  return (
    <div className="space-y-section">
      <header className="space-y-card">
        <h1 className="font-serif text-3xl text-brand-gold">議論ログ</h1>
        <nav className="flex flex-wrap items-center gap-2" aria-label="日付タブ">
          {DAYS.map((d) => {
            const count = logCountsByDay[d] ?? 0;
            const disabled = count === 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                disabled={disabled}
                className={cn(
                  'rounded-card border px-card py-1 text-sm transition',
                  selectedDay === d
                    ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                    : 'border-brand-border text-brand-muted hover:text-brand-text',
                  disabled && 'cursor-not-allowed opacity-40'
                )}
              >
                Day {d}
                <span className="ml-2 text-xs">({count})</span>
              </button>
            );
          })}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-brand-muted">
            <input
              type="checkbox"
              checked={followLatest}
              onChange={(e) => setFollowLatest(e.target.checked)}
              className="accent-brand-gold"
            />
            最新を追従
          </label>
        </nav>
      </header>

      {dayLogs.length === 0 ? (
        <p className="rounded-card border border-brand-border bg-brand-surface p-page text-sm text-brand-muted">
          Day {selectedDay} の議論ログはまだありません。
        </p>
      ) : (
        <>
          <ol ref={listRef} className="flex flex-col gap-card">
            {dayLogs.map((log) => {
              const speaker = charLookup.get(log.speakerId);
              const pinned = isPinned('log', log.id);
              return (
                <li key={log.id} className="animate-fade-in">
                  <LogBubble
                    speakerName={speaker?.name ?? log.speakerId}
                    speakerId={log.speakerId}
                    text={log.text}
                    intent={BUBBLE_INTENT[log.intent]}
                    confidence={log.confidence}
                    isPinned={pinned}
                    onPin={() => toggle('log', log.id, log.day)}
                    timestamp={`turn ${log.turn}`}
                  />
                  {speaker && (
                    <div className="mt-1 pl-16 text-xs">
                      <button
                        type="button"
                        onClick={() => setProfileChar(speaker)}
                        className="text-brand-muted underline-offset-2 transition hover:text-brand-gold hover:underline"
                      >
                        {speaker.name} のプロフィールを開く →
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {isDiscussing && <DiscussionReadyPrompt />}
          {(isDiscussionEnded || ownerOfLatestPhase) && <DiscussionEndedMarker />}
        </>
      )}

      <CharacterProfileModal
        character={profileChar}
        onClose={() => setProfileChar(null)}
        gameId={gameId}
      />
    </div>
  );
}

/**
 * 議論ログは startNewGame / 夜処理で一括生成され、プレイヤーが見る時点で出そろっている
 * (逐次ストリーミングではない)。よって「次の発言を待つ」無限スピナーは出さず、
 * この日の議論が完了していることと次フェーズへの進み方を明示する。
 */
function DiscussionReadyPrompt() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-brand-border bg-brand-surface py-card text-center text-sm text-brand-muted">
      <div className="flex items-center gap-2">
        <span className="h-px w-8 bg-brand-border" />
        <Badge tone="neutral">この日の議論は以上です</Badge>
        <span className="h-px w-8 bg-brand-border" />
      </div>
      <p>
        気になる発言をピン留めしたら、上部メニューの
        <span className="mx-1 font-semibold text-brand-gold">「調査（尋問）へ ▶」</span>
        から次のフェーズに進んでください。
      </p>
    </div>
  );
}

function DiscussionEndedMarker() {
  return (
    <div className="flex items-center justify-center gap-2 py-card">
      <span className="h-px flex-1 bg-brand-border" />
      <Badge tone="neutral">議論終了</Badge>
      <span className="h-px flex-1 bg-brand-border" />
    </div>
  );
}
