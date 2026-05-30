/**
 * A2-01: 事件骨格生成プロンプト。
 * 要件 §6.1 の項目 (人狼/被害者/襲撃時刻/襲撃場所/襲撃経路/主要証拠タイプ/
 * レッドヘリング/解決ロジック) を一度に生成する。
 */

export type BuildCaseSkeletonPromptArgs = {
  /** キャラクター数 (MVP は 6 固定) */
  characterCount: number;
  /** 難易度 */
  difficulty: 'easy' | 'normal' | 'hard';
  /** 多様性のためのシード (前回生成と被らないため) */
  diversitySeed?: string;
};

export function buildCaseSkeletonPrompt(_args: BuildCaseSkeletonPromptArgs): string {
  // TODO(A2-01): プロンプト本文を実装
  return '';
}
