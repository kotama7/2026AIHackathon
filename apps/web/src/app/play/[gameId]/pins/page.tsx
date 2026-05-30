'use client';

import type { Pin } from '@village/shared';
import { use as usePromise, useMemo, useState } from 'react';

import { usePinToggle } from '@/components/game/usePinToggle';
import { Badge, Button, cn, Modal } from '@/components/ui';
import { type ContradictionDraft, useGameStore } from '@/stores/gameStore';

const REF_LABELS: Record<Pin['refType'], string> = {
  log: '発言',
  evidence: '証拠',
  testimony: '証言',
};

export default function PinsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = usePromise(params);
  const pins = useGameStore((s) => s.pins);
  const contradictions = useGameStore((s) => s.contradictions);
  const addContradiction = useGameStore((s) => s.addContradiction);
  const removeContradiction = useGameStore((s) => s.removeContradiction);
  const logs = useGameStore((s) => s.logs);
  const evidence = useGameStore((s) => s.evidence);
  const characters = useGameStore((s) => s.characters);
  const { toggle } = usePinToggle();

  const [refTypeFilter, setRefTypeFilter] = useState<Set<Pin['refType']>>(new Set());
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(new Set());
  const [noteInput, setNoteInput] = useState('');
  const [editing, setEditing] = useState<ContradictionDraft | null>(null);

  const filtered = useMemo(
    () =>
      pins
        .filter((p) => refTypeFilter.size === 0 || refTypeFilter.has(p.refType))
        .filter((p) => dayFilter === null || p.day === dayFilter)
        .slice()
        .sort((a, b) => a.day - b.day),
    [pins, refTypeFilter, dayFilter]
  );

  const allDays = useMemo(() => Array.from(new Set(pins.map((p) => p.day))).sort(), [pins]);

  function pinSummary(pin: Pin): string {
    if (pin.refType === 'log') {
      const log = logs.find((l) => l.id === pin.refId);
      if (!log) return `[log:${pin.refId}]`;
      const speaker = characters.find((c) => c.id === log.speakerId)?.name ?? log.speakerId;
      return `${speaker}: ${log.text}`;
    }
    if (pin.refType === 'evidence') {
      const ev = evidence.find((e) => e.id === pin.refId);
      return ev ? ev.name : `[evidence:${pin.refId}]`;
    }
    return `[testimony:${pin.refId}]`;
  }

  function toggleSelect(id: string) {
    setSelectedPinIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveContradiction() {
    if (selectedPinIds.size === 0) return;
    const now = Date.now();
    addContradiction({
      id: `contradiction-${now}`,
      pinIds: Array.from(selectedPinIds),
      note: noteInput,
      createdAtMs: now,
    });
    setSelectedPinIds(new Set());
    setNoteInput('');
  }

  return (
    <div className="space-y-section">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-brand-gold">ピン留め / 矛盾整理</h1>
        <p className="text-xs text-brand-muted">
          ピン {pins.length} 件 ・ 矛盾候補 {contradictions.length} 件 ・{' '}
          <code>{gameId.slice(0, 12)}</code>
        </p>
      </header>

      {contradictions.length > 0 && (
        <section className="space-y-card">
          <h2 className="font-serif text-xl text-brand-emphasis">保存済み矛盾候補</h2>
          <ul className="flex flex-col gap-2">
            {contradictions.map((c) => (
              <li key={c.id}>
                <ContradictionEntry
                  contradiction={c}
                  pins={pins}
                  pinSummary={pinSummary}
                  onEdit={() => setEditing(c)}
                  onDelete={() => removeContradiction(c.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-card">
        <h2 className="font-serif text-xl text-brand-emphasis">ピン一覧</h2>

        <div className="space-y-2 rounded-card border border-brand-border bg-brand-surface p-card">
          <div className="flex flex-wrap gap-2">
            {(['log', 'evidence', 'testimony'] as Pin['refType'][]).map((rt) => (
              <ChipButton
                key={rt}
                active={refTypeFilter.has(rt)}
                onClick={() =>
                  setRefTypeFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(rt)) next.delete(rt);
                    else next.add(rt);
                    return next;
                  })
                }
              >
                {REF_LABELS[rt]}
              </ChipButton>
            ))}
            <span className="w-px self-stretch bg-brand-border" />
            <ChipButton active={dayFilter === null} onClick={() => setDayFilter(null)}>
              全日
            </ChipButton>
            {allDays.map((d) => (
              <ChipButton key={d} active={dayFilter === d} onClick={() => setDayFilter(d)}>
                Day {d}
              </ChipButton>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-card border border-brand-border bg-brand-surface p-page text-sm text-brand-muted">
            ピン留めがありません。議論ログや証拠タブからピン留めしてください。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((pin) => {
              const checked = selectedPinIds.has(pin.id);
              return (
                <li key={pin.id}>
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-card border bg-brand-surface p-card',
                      checked ? 'border-brand-gold' : 'border-brand-border'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(pin.id)}
                      aria-label="矛盾候補に加える"
                      className="mt-1.5 h-4 w-4 accent-brand-gold"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{REF_LABELS[pin.refType]}</Badge>
                        <span className="text-xs text-brand-muted">Day {pin.day}</span>
                      </div>
                      <p className="line-clamp-2 text-sm text-brand-text">{pinSummary(pin)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(pin.refType, pin.refId, pin.day)}
                      className="text-xs text-brand-muted underline-offset-2 hover:text-brand-danger hover:underline"
                    >
                      解除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedPinIds.size > 0 && (
        <section className="sticky bottom-4 z-10 mx-auto max-w-2xl rounded-card border border-brand-gold/50 bg-brand-surface p-card shadow-modal">
          <p className="text-sm text-brand-text">
            <Badge tone="gold">{selectedPinIds.size}</Badge> 個のピンを矛盾候補にまとめる
          </p>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="メモ (例: A は時計塔にいた、B は自室にいたと言っている — 同時刻に矛盾)"
            rows={2}
            className="mt-2 w-full rounded-card border border-brand-border bg-brand-bg p-2 text-sm focus:border-brand-gold focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPinIds(new Set());
                setNoteInput('');
              }}
            >
              キャンセル
            </Button>
            <Button size="sm" onClick={saveContradiction}>
              保存
            </Button>
          </div>
        </section>
      )}

      <EditContradictionModal draft={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ContradictionEntry({
  contradiction,
  pins,
  pinSummary,
  onEdit,
  onDelete,
}: {
  contradiction: ContradictionDraft;
  pins: Pin[];
  pinSummary: (pin: Pin) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const includedPins = contradiction.pinIds
    .map((id) => pins.find((p) => p.id === id))
    .filter((p): p is Pin => Boolean(p));
  return (
    <div className="rounded-card border border-brand-border bg-brand-surface p-card">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 whitespace-pre-wrap text-sm text-brand-text">
          {contradiction.note || '(メモ無し)'}
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            編集
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            削除
          </Button>
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {includedPins.map((p) => (
          <li
            key={p.id}
            className="rounded border border-brand-border bg-brand-bg px-2 py-1 text-xs text-brand-muted"
          >
            <Badge tone="neutral">{REF_LABELS[p.refType]}</Badge>{' '}
            <span className="ml-1 text-brand-text">{pinSummary(p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditContradictionModal({
  draft,
  onClose,
}: {
  draft: ContradictionDraft | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState(draft?.note ?? '');
  const removeContradiction = useGameStore((s) => s.removeContradiction);
  const addContradiction = useGameStore((s) => s.addContradiction);

  if (!draft) return null;

  const save = () => {
    removeContradiction(draft.id);
    addContradiction({ ...draft, note });
    onClose();
  };

  return (
    <Modal
      open={draft !== null}
      onOpenChange={(o) => !o && onClose()}
      title="矛盾候補を編集"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save}>保存</Button>
        </>
      }
    >
      <textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="メモ"
        className="w-full rounded-card border border-brand-border bg-brand-bg p-2 text-sm focus:border-brand-gold focus:outline-none"
      />
    </Modal>
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
