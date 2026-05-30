import type { CharacterId, FirebaseTimestamp, LogId } from './common.js';
import type { EmotionalState } from './character.js';
import type { TruthStatus } from './testimony.js';

/** 発言意図 (LLM が出力、ゲームロジックがログ集約に使う) */
export type DialogueIntent =
  | 'accuse' // 誰かを名指しで疑う
  | 'defend' // 自分または他者を擁護
  | 'suspicion' // 疑念を表明 (名指しなし)
  | 'observation' // 観察事実の共有
  | 'question' // 質問
  | 'agree' // 賛同
  | 'disagree' // 反対
  | 'evasive'; // はぐらかし

export type DialoguePhase = 'morning' | 'discussion' | 'investigation' | 'trial' | 'night';

/**
 * クライアントに公開する公開発言ログ。
 * truth_status (実装上の真偽分類) は伏せる。
 */
export type DialogueLog = {
  id: LogId;
  day: number;
  phase: DialoguePhase;
  /** ターン番号 (議論内での順序) */
  turn: number;
  speakerId: CharacterId;
  /** 名指しの対象 (intent によっては空) */
  targetId?: CharacterId;
  text: string;
  intent: DialogueIntent;
  /** 0-1: 発言者の確信度 (UI 表示用、生成時に LLM が出力) */
  confidence: number;
  emotion: EmotionalState;
  createdAt: FirebaseTimestamp;
};

/**
 * 内部用の発言メタデータ。真偽分類など、Validator や真相開示で使う情報を含む。
 * internal/{gameId}/logMetadata/{logId} に格納。
 */
export type DialogueLogMetadata = {
  logId: LogId;
  truthStatus: TruthStatus;
  /** 発言時に参照したキャラの knownFacts キー */
  relatedFacts: string[];
};
