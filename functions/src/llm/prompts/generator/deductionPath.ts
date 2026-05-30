/**
 * A2-06: deduction_path 生成プロンプト。
 * 要件 §6.6: 推理可能性を保証する step 列。各 step に required_evidence /
 * required_testimonies / excluded_suspects を含める。
 */
import type { CaseSkeleton, Character, Evidence, Testimony } from '@village/shared';

export type BuildDeductionPathPromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
  evidence: Evidence[];
  testimonies: Testimony[];
};

export function buildDeductionPathPrompt(_args: BuildDeductionPathPromptArgs): string {
  // TODO(A2-06): プロンプト本文を実装
  return '';
}
