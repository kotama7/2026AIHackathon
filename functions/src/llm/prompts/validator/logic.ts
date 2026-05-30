/**
 * A2-08: 論理整合性 LLM judge (補助)。
 * 物理整合・知識範囲チェックは純ロジック、文脈整合は LLM に確認。
 */
import type { CaseTruth } from '@village/shared';

export type BuildLogicJudgePromptArgs = {
  truth: CaseTruth;
};

export function buildLogicJudgePrompt(_args: BuildLogicJudgePromptArgs): string {
  // TODO(A2-08): プロンプト本文を実装
  return '';
}
