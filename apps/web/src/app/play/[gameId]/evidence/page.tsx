'use client';

import type { CharacterPublic, EvidencePublic, EvidenceReliability } from '@village/shared';
import { useRouter } from 'next/navigation';
import { use as usePromise, useMemo, useState } from 'react';

import { usePinToggle } from '@/components/game/usePinToggle';
import { Badge, Button, cn, EvidenceCard, Modal } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';

const RELIABILITIES: EvidenceReliability[] = ['A', 'B', 'C'];

export default function EvidencePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const router = useRouter();
  const evidence = useGameStore((s) => s.evidence);
  const characters = useGameStore((s) => s.characters);
  const { isPinned, toggle } = usePinToggle();

  const [relFilter, setRelFilter] = useState<Set<EvidenceReliability>>(new Set());
  const [charFilter, setCharFilter] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [detail, setDetail] = useState<EvidencePublic | null>(null);

  const allDays = useMemo(() => Array.from(new Set(evidence.map((e) => e.day))).sort(), [evidence]);

  const filtered = useMemo(() => {
    return evidence
      .filter((e) => relFilter.size === 0 || relFilter.has(e.reliability))
      .filter((e) => charFilter.size === 0 || e.relatedCharacters.some((c) => charFilter.has(c)))
      .filter((e) => dayFilter === null || e.day === dayFilter)
      .slice()
      .sort((a, b) => b.day - a.day);
  }, [evidence, relFilter, charFilter, dayFilter]);

  return (
    <div className="space-y-section">
      <header className="space-y-card">
        <h1 className="font-serif text-3xl text-brand-gold">証拠一覧</h1>
        <p className="text-xs text-brand-muted">
          表示中 {filtered.length} / 全 {evidence.length} 件
        </p>
      </header>

      <section className="space-y-card rounded-card border border-brand-border bg-brand-surface p-card">
        <h2 className="text-xs font-semibold text-brand-muted">フィルタ</h2>
        <FilterGroup label="確度">
          {RELIABILITIES.map((r) => (
            <ChipButton
              key={r}
              active={relFilter.has(r)}
              onClick={() => setRelFilter((prev) => toggleInSet(prev, r))}
            >
              {r}
            </ChipButton>
          ))}
        </FilterGroup>
        {allDays.length > 0 && (
          <FilterGroup label="入手日">
            <ChipButton active={dayFilter === null} onClick={() => setDayFilter(null)}>
              すべて
            </ChipButton>
            {allDays.map((d) => (
              <ChipButton key={d} active={dayFilter === d} onClick={() => setDayFilter(d)}>
                Day {d}
              </ChipButton>
            ))}
          </FilterGroup>
        )}
        {characters.length > 0 && (
          <FilterGroup label="関連人物">
            {characters.map((c) => (
              <CharChipButton
                key={c.id}
                character={c}
                active={charFilter.has(c.id)}
                onClick={() => setCharFilter((prev) => toggleInSet(prev, c.id))}
              />
            ))}
          </FilterGroup>
        )}
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-card border border-brand-border bg-brand-surface p-page text-sm text-brand-muted">
          条件に合う証拠がありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-card md:grid-cols-2">
          {filtered.map((ev) => (
            <div key={ev.id} className="flex flex-col gap-2">
              <EvidenceCard
                evidence={ev}
                isPinned={isPinned('evidence', ev.id)}
                onPin={() => toggle('evidence', ev.id, ev.day)}
                onPresent={() => router.push(`/play/${gameId}/interrogate?evidence=${ev.id}`)}
              />
              <button
                type="button"
                onClick={() => setDetail(ev)}
                className="self-start text-xs text-brand-muted underline-offset-2 transition hover:text-brand-gold hover:underline"
              >
                詳細を開く →
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.name ?? '証拠詳細'}
        description={detail ? `Day ${detail.day} に入手` : undefined}
        footer={
          <Button variant="ghost" onClick={() => setDetail(null)}>
            閉じる
          </Button>
        }
      >
        {detail && (
          <div className="space-y-card">
            <Badge
              tone={
                detail.reliability === 'A'
                  ? 'gold'
                  : detail.reliability === 'B'
                    ? 'info'
                    : 'neutral'
              }
            >
              確度 {detail.reliability}
            </Badge>
            <p className="text-sm text-brand-text">{detail.description}</p>
            {detail.relatedCharacters.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detail.relatedCharacters.map((cid) => {
                  const c = characters.find((x) => x.id === cid);
                  return (
                    <Badge key={cid} tone="neutral">
                      関連: {c?.name ?? cid}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function toggleInSet<T>(s: Set<T>, v: T): Set<T> {
  const next = new Set(s);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-brand-muted">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs transition',
        active
          ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
          : 'border-brand-border text-brand-muted hover:text-brand-text'
      )}
    >
      {children}
    </button>
  );
}

function CharChipButton({
  character,
  active,
  onClick,
}: {
  character: CharacterPublic;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs transition',
        active
          ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
          : 'border-brand-border text-brand-muted hover:text-brand-text',
        !character.isAlive && 'line-through opacity-50'
      )}
    >
      {character.name}
    </button>
  );
}
