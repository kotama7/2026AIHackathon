/**
 * A4-02: 他キャラ反応プロンプト。
 * 弁明後の短い (1-2 文) 反応。bias / relationship に従う。
 */
import type { Character } from '@village/shared';

export type BuildReactionPromptArgs = {
  reactor: Character;
  suspect: Character;
  defenseText: string;
};

export function buildReactionPrompt(_args: BuildReactionPromptArgs): string {
  // TODO(A4-02): プロンプト本文を実装
  return '';
}
