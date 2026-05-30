import type { CharacterId, EvidenceId, TestimonyId } from './common.js';

/**
 * 推理経路の 1 ステップ (要件 §6.6, §12.8)。
 * プレイヤーがこの reasoning を辿ることで人狼に到達できる、論理的階段。
 */
export type DeductionStep = {
  step: number;
  /** この step の推理内容 (自然言語) */
  reasoning: string;
  /** この step を成立させるために必須の証拠 ID 群 */
  requiredEvidence: EvidenceId[];
  /** この step を成立させるために必須の証言 ID 群 */
  requiredTestimonies: TestimonyId[];
  /** この step で除外される容疑者 ID 群 */
  excludedSuspects: CharacterId[];
};

/** 真相に内包される推理経路全体 */
export type DeductionPath = {
  steps: DeductionStep[];
  /** 最終的に到達する人狼 ID */
  finalTarget: CharacterId;
};
