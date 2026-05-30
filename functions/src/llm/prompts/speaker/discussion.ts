/**
 * A3-01: 議論ログ生成プロンプト (キャラ 1 ターン分)。
 * 要件 §10.3: known_facts のみを渡し、嘘ポリシーに従って自然な発言を生成。
 */
import type { Character, DialogueLog } from '@village/shared';

export type BuildDiscussionPromptArgs = {
  speaker: Character;
  /** これまでの議論ログ (要約 or 直近 N 件) */
  priorLogs: DialogueLog[];
  /** 議論の目的 (例: "事件について自分の見解を述べる") */
  goal: string;
};

export function buildDiscussionPrompt(_args: BuildDiscussionPromptArgs): string {
  // TODO(A3-01): プロンプト本文を実装
  return '';
}
