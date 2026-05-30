import type { CharacterId, EvidenceId, TestimonyId } from './common.js';

/**
 * 発言・証言の真偽分類 (要件 §6.5)
 * - truth:           真実
 * - lie:             意図的な嘘
 * - misunderstanding: 誤解
 * - omission:        重要情報の隠蔽
 * - uncertainty:     不確かな証言
 */
export type TruthStatus = 'truth' | 'lie' | 'misunderstanding' | 'omission' | 'uncertainty';

/**
 * Truth Compiler が生成する証言。internal/ にのみ保存される。
 * クライアントには DialogueLog として truth_status を伏せた形で公開する。
 */
export type Testimony = {
  id: TestimonyId;
  day: number;
  speakerId: CharacterId;
  /** 発言テキスト本体 */
  text: string;
  truthStatus: TruthStatus;
  /** truthStatus = 'lie' の場合に必須: なぜ嘘をついているか */
  lieReason?: string;
  /** この証言を崩せる証拠/証言 ID 群 */
  contradictedBy: (EvidenceId | TestimonyId)[];
  /** この証言生成時に参照したキャラの knownFacts のキー (知識範囲ガード用) */
  knownFactsUsed: string[];
};
