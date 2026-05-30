'use client';

import type { EvidencePublic } from '@village/shared';

import { Badge, Button, cn, Modal } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';

type Props = {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function EvidencePicker({ open, onClose, selectedId, onSelect }: Props) {
  const evidence = useGameStore((s) => s.evidence);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="提示する証拠を選ぶ"
      description="尋問対象に突きつける証拠を 1 つ選択"
      className="max-w-2xl"
      footer={
        <Button variant="ghost" onClick={onClose}>
          閉じる
        </Button>
      }
    >
      {evidence.length === 0 ? (
        <p className="text-sm text-brand-muted">まだ証拠を入手していません。</p>
      ) : (
        <ul className="grid max-h-[24rem] grid-cols-1 gap-2 overflow-y-auto pr-2 md:grid-cols-2">
          {evidence.map((ev) => (
            <li key={ev.id}>
              <EvidencePickerCard
                evidence={ev}
                selected={selectedId === ev.id}
                onSelect={() => {
                  onSelect(ev.id);
                  onClose();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function EvidencePickerCard({
  evidence,
  selected,
  onSelect,
}: {
  evidence: EvidencePublic;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-card border bg-brand-bg p-card text-left transition',
        selected
          ? 'border-brand-gold ring-1 ring-brand-gold/40'
          : 'border-brand-border hover:border-brand-gold/50'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-serif text-sm text-brand-emphasis">{evidence.name}</span>
        <Badge tone={evidence.reliability === 'A' ? 'gold' : 'neutral'}>
          {evidence.reliability}
        </Badge>
      </div>
      <p className="line-clamp-2 text-xs text-brand-muted">{evidence.description}</p>
      <span className="text-xs text-brand-muted">Day {evidence.day}</span>
    </button>
  );
}
