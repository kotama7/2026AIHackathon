import type { CharacterId, EvidenceId, FirebaseTimestamp, TestimonyId } from './common.js';
import type { TruthStatus } from './testimony.js';

/**
 * 尋問アクションの種類 (要件 §10.5)。コストは constants.QUESTION_COSTS を参照。
 */
export type QuestionType =
  | 'normal' // 通常質問
  | 'deep_dive' // 深掘り質問
  | 'evidence' // 証拠提示
  | 'contradiction' // 矛盾追及
  | 'force_testimony'; // 強制証言

/**
 * プレイヤーが実行した尋問アクションと、その応答を記録するエンティティ。
 * users/{uid}/games/{gameId}/interrogations/{id} に保存。
 */
export type InterrogationAction = {
  id: string;
  day: number;
  targetId: CharacterId;
  questionType: QuestionType;
  /** プレイヤーが入力した質問本文 (MVP は選択式テンプレ、将来は自由入力可) */
  questionText: string;
  /** 証拠提示型でのみ使用 */
  presentedEvidenceId?: EvidenceId;
  /** 矛盾追及型でのみ使用 */
  presentedContradictionIds?: (TestimonyId | string)[];
  /** ポイント消費量 */
  cost: number;
  /** AI 住民の回答テキスト */
  answerText: string;
  /** 内部判定: 回答が真実 / 嘘 / 誤解 / 沈黙 / 不確実か */
  truthStatus: TruthStatus;
  /** この尋問でこのキャラのプレイヤー信頼度がどれだけ変化したか */
  trustDelta: number;
  createdAt: FirebaseTimestamp;
};
