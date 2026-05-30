'use client';

import type { QuestionType } from '@village/shared';
import { QUESTION_COSTS } from '@village/shared';

import { Badge, Button, cn } from '@/components/ui';

const QUESTION_LABELS: Record<QuestionType, { label: string; hint: string }> = {
  normal: { label: '通常質問', hint: '当たり障りない範囲で訊く' },
  deep_dive: { label: '深掘り', hint: '時系列や動機を粘り強く問う' },
  evidence: { label: '証拠提示', hint: '具体的な証拠を突きつける' },
  contradiction: { label: '矛盾追及', hint: '過去の発言や別キャラとの食い違いを指摘' },
  force_testimony: { label: '強制証言', hint: '信頼度を犠牲にして本音を引き出す' },
};

const TYPES: QuestionType[] = [
  'normal',
  'deep_dive',
  'evidence',
  'contradiction',
  'force_testimony',
];

export type QuestionRequirement = {
  /** 提示すべき証拠が選択済みか */
  evidenceSelected?: boolean;
  /** 矛盾候補が 1 つ以上指定済みか */
  contradictionsSelected?: boolean;
};

type Props = {
  selectedType: QuestionType | null;
  onSelectType: (type: QuestionType) => void;
  remainingPoints: number;
  requirement: QuestionRequirement;
  onPickEvidence: () => void;
  onPickContradictions: () => void;
  onExecute: () => void;
  submitting: boolean;
  disabled?: boolean;
};

export function QuestionTypePanel({
  selectedType,
  onSelectType,
  remainingPoints,
  requirement,
  onPickEvidence,
  onPickContradictions,
  onExecute,
  submitting,
  disabled,
}: Props) {
  const needsEvidence = selectedType === 'evidence';
  const needsContradiction = selectedType === 'contradiction';
  const requirementOk =
    (!needsEvidence || requirement.evidenceSelected) &&
    (!needsContradiction || requirement.contradictionsSelected);
  const selectedCost = selectedType ? QUESTION_COSTS[selectedType] : 0;
  const enoughPoints = selectedCost <= remainingPoints;

  return (
    <div className="flex flex-col gap-card rounded-card border border-brand-border bg-brand-surface p-card">
      <h3 className="font-serif text-sm text-brand-muted">質問アクション</h3>

      <ul className="flex flex-col gap-1">
        {TYPES.map((t) => {
          const cost = QUESTION_COSTS[t];
          const affordable = cost <= remainingPoints;
          const selected = selectedType === t;
          const meta = QUESTION_LABELS[t];
          return (
            <li key={t}>
              <button
                type="button"
                disabled={disabled || !affordable}
                onClick={() => onSelectType(t)}
                title={
                  !affordable ? `ポイント不足 (必要 ${cost}, 残 ${remainingPoints})` : meta.hint
                }
                className={cn(
                  'flex w-full items-start justify-between gap-2 rounded-card border px-card py-2 text-left text-sm transition',
                  selected
                    ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                    : 'border-brand-border text-brand-text hover:bg-brand-bg',
                  (!affordable || disabled) && 'cursor-not-allowed opacity-40'
                )}
              >
                <span className="flex flex-col">
                  <span className="font-serif">{meta.label}</span>
                  <span className="text-xs text-brand-muted">{meta.hint}</span>
                </span>
                <Badge tone={affordable ? 'gold' : 'danger'}>−{cost}pt</Badge>
              </button>
            </li>
          );
        })}
      </ul>

      {needsEvidence && (
        <SelectorButton
          onClick={onPickEvidence}
          done={requirement.evidenceSelected ?? false}
          doneLabel="証拠を変更"
          undoneLabel="提示する証拠を選ぶ"
        />
      )}
      {needsContradiction && (
        <SelectorButton
          onClick={onPickContradictions}
          done={requirement.contradictionsSelected ?? false}
          doneLabel="矛盾を変更"
          undoneLabel="矛盾候補を選ぶ"
        />
      )}

      <Button
        size="md"
        disabled={disabled || !selectedType || !enoughPoints || !requirementOk || submitting}
        onClick={onExecute}
        className="mt-2 w-full"
      >
        {submitting
          ? '応答待ち…'
          : !selectedType
            ? 'タイプを選んでください'
            : !enoughPoints
              ? 'ポイント不足'
              : !requirementOk
                ? needsEvidence
                  ? '証拠を選んでください'
                  : '矛盾を選んでください'
                : `実行 (−${selectedCost}pt)`}
      </Button>
    </div>
  );
}

function SelectorButton({
  onClick,
  done,
  doneLabel,
  undoneLabel,
}: {
  onClick: () => void;
  done: boolean;
  doneLabel: string;
  undoneLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-card border border-dashed px-card py-2 text-sm transition',
        done
          ? 'border-brand-gold text-brand-gold'
          : 'border-brand-border text-brand-muted hover:text-brand-text'
      )}
    >
      {done ? `✓ ${doneLabel}` : `+ ${undoneLabel}`}
    </button>
  );
}
