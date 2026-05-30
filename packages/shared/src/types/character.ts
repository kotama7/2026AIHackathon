import type { CharacterId } from './common.js';

export type Role = 'villager' | 'werewolf';
export type EmotionalState = 'calm' | 'tense' | 'angry' | 'fearful' | 'guilty' | 'confident';

/** どの条件で嘘をつくか / つかないか */
export type LiePolicy = {
  /** これに関しては嘘をつきうるトピック ID 群 (例: "night_location", "relationship_with_victim") */
  willLieAbout: string[];
  /** 絶対に嘘をつかないトピック ID 群 (例: "own_role") */
  willNotLieAbout: string[];
};

/** どの条件で協力するか */
export type CooperationPolicy = {
  /** 協力する相手 ID 群 */
  cooperateWith: CharacterId[];
  /** 協力する条件 (自由テキスト、LLM 用) */
  conditions: string;
};

/** 他キャラとの関係性 */
export type Relationship = {
  withCharacter: CharacterId;
  /** 関係性ラベル: 友人 / 恋人 / 敵対 / 無関心 / 嫉妬 など */
  label: string;
  /** -100 (敵対) 〜 100 (信頼) */
  affinity: number;
};

/**
 * クライアント (UI) に公開してよいキャラクター情報。
 * secret / private_goal / lie_policy などの内部情報は含まない。
 */
export type CharacterPublic = {
  id: CharacterId;
  name: string;
  /** 表向きの性格 */
  publicPersonality: string;
  /** 口調 */
  speakingStyle: string;
  /** 村内での立場 (例: "村長", "鍛冶屋") */
  socialRole: string;
  /** UI 表示色 (decorative) */
  accentColor?: string;
  /** プレイヤー視点での生死 */
  isAlive: boolean;
  /** プレイヤーへの信頼度 0-100 */
  trustToPlayer: number;
};

/**
 * Truth Compiler が生成する完全なキャラクター情報。
 * Firestore の internal/ コレクションにのみ保存する。
 */
export type Character = CharacterPublic & {
  role: Role;
  isWerewolf: boolean;
  /** 他キャラに見せない秘密 */
  secret: string;
  /** 個人的な目的 */
  privateGoal: string;
  /** 恐れていること */
  fear: string;
  /** 疑いやすい・信じやすい相手や、その傾向 */
  bias: string;
  /** このキャラが事件について知っている事実 ID 群 */
  knownFacts: string[];
  /** キャラ ID → 0-100 の疑念度 */
  suspicions: Record<CharacterId, number>;
  emotionalState: EmotionalState;
  /** 0-100: 嘘をつく傾向の強さ */
  lieTendency: number;
  /** 0-100: 協力度合い */
  cooperationLevel: number;
  liePolicy: LiePolicy;
  cooperationPolicy: CooperationPolicy;
  relationships: Relationship[];
};

/**
 * Character を公開用に縮約するヘルパー型 (関数は別レイヤで)。
 */
export type ToPublicKey = keyof CharacterPublic;
