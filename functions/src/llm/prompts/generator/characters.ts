/**
 * A2-02: キャラクター思惑生成プロンプト。
 * 要件 §6.2: public_personality / private_goal / fear / secret / bias /
 * relationship / lie_policy / cooperation_policy を全 6 人分。
 */
import type { CaseSkeleton } from '@village/shared';

export type BuildCharactersPromptArgs = {
  skeleton: CaseSkeleton;
};

export function buildCharactersPrompt(_args: BuildCharactersPromptArgs): string {
  // TODO(A2-02): プロンプト本文を実装
  return '';
}
