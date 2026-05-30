/**
 * A2-04: 証拠生成プロンプト。
 * 要件 §6.4: 確定 / 補助 / ノイズの 3 階層、各 timeline event から派生。
 */
import type { CaseSkeleton, Character, TimelineEvent } from '@village/shared';

export type BuildEvidencePromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
  timeline: TimelineEvent[];
};

export function buildEvidencePrompt(_args: BuildEvidencePromptArgs): string {
  // TODO(A2-04): プロンプト本文を実装
  return '';
}
