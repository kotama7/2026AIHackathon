/**
 * A3-02: 尋問回答プロンプト。
 * QuestionType ごとに分岐: normal / deep_dive / evidence / contradiction / force_testimony。
 */
import type { Character, Evidence, QuestionType, Testimony } from '@village/shared';

export type BuildInterrogationPromptArgs = {
  target: Character;
  questionType: QuestionType;
  questionText: string;
  /** evidence 提示型でのみ */
  presentedEvidence?: Evidence;
  /** contradiction 追及型でのみ */
  presentedContradictions?: Testimony[];
  /** target の過去発言 (整合性ガード用) */
  pastUtterances: string[];
};

export function buildInterrogationPrompt(_args: BuildInterrogationPromptArgs): string {
  // TODO(A3-02): プロンプト本文を実装
  return '';
}
