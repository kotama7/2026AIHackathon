import type { CharacterId, EvidenceId, TimelineEventId } from './common.js';

/**
 * 証拠の階層 (要件 §6.4)
 * - confirmatory: 確定証拠 (真犯人に強く接続)
 * - supporting:   補助証拠 (確定証拠を補強)
 * - noise:        ノイズ証拠 (レッドヘリングへ誘導)
 */
export type EvidenceCategory = 'confirmatory' | 'supporting' | 'noise';

/**
 * 証拠の確度ランク (UI 表示用)
 * - A: 高 / B: 中 / C: 低
 */
export type EvidenceReliability = 'A' | 'B' | 'C';

/**
 * クライアントに公開してよい証拠情報。
 * trueInterpretation / points_to / weight などの内部情報は含まない。
 */
export type EvidencePublic = {
  id: EvidenceId;
  /** 何日目に入手した証拠か */
  day: number;
  name: string;
  description: string;
  reliability: EvidenceReliability;
  /** 関連すると推測される人物 ID 群 (示唆) */
  relatedCharacters: CharacterId[];
};

/**
 * Truth Compiler が生成する完全な証拠情報。internal/ にのみ保存。
 */
export type Evidence = EvidencePublic & {
  category: EvidenceCategory;
  /** この証拠が示唆する人物 (真の解釈における) */
  pointsTo: CharacterId[];
  /** 証拠強度 (推理可能性スコアの加算値、典型: confirmatory=3 / supporting=2 / noise=1) */
  weight: number;
  /** 曖昧性 0 (明確) 〜 3 (極めて曖昧) */
  ambiguity: number;
  /** 真の意味 (真相開示時に表示される説明文) */
  trueInterpretation: string;
  /** 発生源となった TimelineEvent */
  sourceTimelineEvent: TimelineEventId;
};
