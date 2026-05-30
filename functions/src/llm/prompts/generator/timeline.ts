/**
 * A2-03: 夜間タイムライン生成プロンプト。
 * 各キャラの 23:00-01:00 の行動を物理整合つきで生成。
 */
import type { CaseSkeleton, Character } from '@village/shared';

export type BuildTimelinePromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
};

export function buildTimelinePrompt(_args: BuildTimelinePromptArgs): string {
  // TODO(A2-03): プロンプト本文を実装
  return '';
}
