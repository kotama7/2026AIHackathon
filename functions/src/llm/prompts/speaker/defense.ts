/**
 * A4-01: 弁明生成プロンプト。
 * 容疑者が人狼か村人かで戦略を分ける。
 */
import type { Character, Evidence, Testimony } from '@village/shared';

export type BuildDefensePromptArgs = {
  suspect: Character;
  presentedEvidence: Evidence[];
  presentedContradictions: Testimony[];
};

export function buildDefensePrompt(_args: BuildDefensePromptArgs): string {
  // TODO(A4-01): プロンプト本文を実装
  return '';
}
