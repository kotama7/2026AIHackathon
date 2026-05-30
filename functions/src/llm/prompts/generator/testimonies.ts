/**
 * A2-05: 証言生成プロンプト。
 * 要件 §6.5: truth / lie / misunderstanding / omission / uncertainty に分類、
 * 嘘には lie_reason と contradicted_by が必須。
 */
import type { CaseSkeleton, Character, Evidence, TimelineEvent } from '@village/shared';

export type BuildTestimoniesPromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
};

export function buildTestimoniesPrompt(_args: BuildTestimoniesPromptArgs): string {
  // TODO(A2-05): プロンプト本文を実装
  return '';
}
