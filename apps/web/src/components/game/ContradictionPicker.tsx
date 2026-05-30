'use client';

import type { Pin } from '@village/shared';

import { Badge, Button, cn, Modal } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';

type Props = {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

const REF_TYPE_LABEL: Record<Pin['refType'], string> = {
  log: '発言',
  evidence: '証拠',
  testimony: '証言',
};

export function ContradictionPicker({ open, onClose, selectedIds, onChange }: Props) {
  const pins = useGameStore((s) => s.pins);
  const logs = useGameStore((s) => s.logs);
  const evidence = useGameStore((s) => s.evidence);
  const characters = useGameStore((s) => s.characters);

  const charNameById = (id: string) => characters.find((c) => c.id === id)?.name ?? id;

  const summaryFor = (pin: Pin) => {
    if (pin.refType === 'log') {
      const log = logs.find((l) => l.id === pin.refId);
      if (!log) return `[log:${pin.refId}]`;
      return `${charNameById(log.speakerId)}: ${log.text}`;
    }
    if (pin.refType === 'evidence') {
      const ev = evidence.find((e) => e.id === pin.refId);
      return ev ? ev.name : `[evidence:${pin.refId}]`;
    }
    return `[testimony:${pin.refId}]`;
  };

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="矛盾候補を選ぶ"
      description="ピン留めから矛盾追及に使うものを複数選択"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onChange([])}>
            選択クリア
          </Button>
          <Button onClick={onClose}>確定 ({selectedIds.length})</Button>
        </>
      }
    >
      {pins.length === 0 ? (
        <p className="text-sm text-brand-muted">
          まだピン留めがありません。議論ログや証拠タブからピン留めしてください。
        </p>
      ) : (
        <ul className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto pr-2">
          {pins.map((pin) => {
            const checked = selectedIds.includes(pin.id);
            return (
              <li key={pin.id}>
                <button
                  type="button"
                  onClick={() => toggle(pin.id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-card border bg-brand-bg p-card text-left transition',
                    checked
                      ? 'border-brand-gold ring-1 ring-brand-gold/40'
                      : 'border-brand-border hover:border-brand-gold/50'
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
                    {checked ? '✓' : ''}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">{REF_TYPE_LABEL[pin.refType]}</Badge>
                      <span className="text-xs text-brand-muted">Day {pin.day}</span>
                    </span>
                    <span className="line-clamp-2 text-sm text-brand-text">{summaryFor(pin)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
