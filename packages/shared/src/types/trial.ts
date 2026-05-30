import type { CharacterId, EvidenceId, FirebaseTimestamp, TestimonyId } from './common.js';

/** 判決選択肢 (MVP は処刑 / 保留のみ。将来は監視/拘束/再審を追加可) */
export type Verdict = 'execute' | 'hold';

/**
 * 裁判フェーズでプレイヤーが提示した矛盾候補。
 * users/{uid}/games/{gameId}/contradictions/{id} に保存。
 */
export type ContradictionCandidate = {
  id: string;
  /** 関連するピン ID 群 */
  pinIds: string[];
  /** プレイヤーのメモ */
  note: string;
  createdAt: FirebaseTimestamp;
};

/** 裁判結果の記録 (要件 §12.9) */
export type TrialDecision = {
  day: number;
  suspectId: CharacterId;
  presentedEvidence: EvidenceId[];
  /** 提示した矛盾候補の ID 群 (内部的には testimony id 列を含む) */
  presentedContradictions: (TestimonyId | string)[];
  verdict: Verdict;
  /** verdict = 'execute' の場合、その判決が正解か (人狼を指したか) */
  wasCorrect?: boolean;
  /** 弁明テキスト (LLM 生成) */
  defenseText: string;
  /** 他キャラの反応 */
  reactions: Array<{
    characterId: CharacterId;
    text: string;
    stance: 'support' | 'oppose' | 'neutral';
  }>;
  createdAt: FirebaseTimestamp;
};
