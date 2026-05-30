/**
 * A2-07: 特定可能性 LLM judge (補助)。
 * 純ロジックでスコア集計するが、grey ケースは LLM に「真犯人が真犯人と特定できるか」を聞く。
 */
import type { CaseTruth } from '@village/shared';

export type BuildDeducibilityJudgePromptArgs = {
  truth: CaseTruth;
};

export function buildDeducibilityJudgePrompt(_args: BuildDeducibilityJudgePromptArgs): string {
  // TODO(A2-07): プロンプト本文を実装
  return '';
}
