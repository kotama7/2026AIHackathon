import type { CharacterId, FirebaseTimestamp, GameId, UserId } from './common.js';

/** ゲーム進行フェーズ */
export type GamePhase =
  | 'morning' // 朝: 被害発表
  | 'discussion' // 議論: AI 住民の自動議論
  | 'investigation' // 調査: プレイヤーが尋問
  | 'organize' // 整理: ピン/矛盾整理
  | 'trial' // 裁判
  | 'night' // 夜: 監視対象選択
  | 'result'; // 終了

export type GameStatus =
  | 'in_progress'
  | 'won' // 人狼処刑
  | 'lost_werewolf_survived' // 日数切れで人狼生存
  | 'lost_too_few_villagers' // 村人生存数不足
  | 'lost_trust_collapsed' // 信頼度崩壊
  | 'corrupted'; // 状態破壊 (フォールバック)

export type GameDay = 1 | 2 | 3;

/**
 * users/{uid}/games/{gameId}/meta ドキュメント本体。
 * クライアントからは read のみ。書き込みは Functions 経由。
 */
export type GameMeta = {
  gameId: GameId;
  uid: UserId;
  currentDay: GameDay;
  currentPhase: GamePhase;
  /** 当日の残り尋問ポイント */
  remainingPoints: number;
  /** 生存キャラクター ID 群 */
  aliveCharacters: CharacterId[];
  /** 村全体の信頼度 0-100 */
  villageTrust: number;
  status: GameStatus;
  /** デモ用シードゲームかどうか */
  isSeedGame: boolean;
  /**
   * 事件導入ブリーフィング (ネタバレなし)。Day1 開始時にプレイヤーへ事件の概要
   * (いつ・どこで何が起きたか / 容疑者) を提示する。実ゲームは startNewGame で生成。
   */
  incidentBriefing?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
};

/** ピン留めエントリ (発言 / 証拠 / 証言を保存) */
export type Pin = {
  id: string;
  refType: 'log' | 'evidence' | 'testimony';
  refId: string;
  day: number;
  note?: string;
  createdAt: FirebaseTimestamp;
};
