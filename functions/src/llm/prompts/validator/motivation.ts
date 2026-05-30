/**
 * A2-09: 思惑整合性 LLM judge。
 * 「各キャラの行動が personality / private_goal / fear と矛盾しないか」を yes/no + 理由で。
 */
import type { Character } from '@village/shared';

export type BuildMotivationJudgePromptArgs = {
  character: Character;
};

export function buildMotivationJudgePrompt(_args: BuildMotivationJudgePromptArgs): string {
  // TODO(A2-09): プロンプト本文を実装
  return '';
}
