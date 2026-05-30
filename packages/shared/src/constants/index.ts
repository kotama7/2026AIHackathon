import type { QuestionType } from '../types/interrogation.js';

/** 1 日あたりの初期尋問ポイント (要件 §9.1) */
export const INITIAL_INTERROGATION_POINTS = 5;

/** 質問アクションごとのポイントコスト (要件 §10.5) */
export const QUESTION_COSTS: Record<QuestionType, number> = {
  normal: 1,
  deep_dive: 2,
  evidence: 1,
  contradiction: 2,
  force_testimony: 3,
};

/** 初期キャラクター数 (要件 §9.1) */
export const INITIAL_CHARACTER_COUNT = 6;

/** 最大日数 (要件 §9.1) */
export const MAX_DAYS = 3;

/** 1 晩あたりの監視対象数 */
export const NIGHT_WATCH_TARGETS = 1;

/** 信頼度の変化量 (要件 §10.10 / A3-04) */
export const TRUST_DELTAS = {
  CORRECT_CONTRADICTION: { target: 5, village: 3 },
  WRONG_ACCUSATION: { target: -10, village: -5 },
  FORCE_TESTIMONY: { target: -8, village: -3 },
  EXECUTE_WEREWOLF: { village: 20 },
  EXECUTE_VILLAGER: { village: -30 },
} as const;

/** 推理可能性スコアの閾値 (要件 §6.7) */
export const DEDUCIBILITY_THRESHOLDS = {
  WEREWOLF_SCORE_MIN: 7,
  WEREWOLF_SCORE_MAX: 10,
  RED_HERRING_SCORE_MIN: 4,
  RED_HERRING_SCORE_MAX: 6,
  GAP_MIN: 2,
  GAP_MAX: 4,
  REQUIRED_EVIDENCE_FOR_WEREWOLF: 2,
} as const;

/** 敗北条件の閾値 */
export const LOSE_THRESHOLDS = {
  MIN_ALIVE_VILLAGERS: 2,
  MIN_VILLAGE_TRUST: 20,
} as const;

/** 証拠 weight のデフォルト値 */
export const EVIDENCE_WEIGHT_DEFAULTS = {
  confirmatory: 3,
  supporting: 2,
  noise: 1,
} as const;

/**
 * Firestore コレクションパス定数。
 * 文字列を散らさず一箇所に集約することで rename / refactor を安全にする。
 */
export const COLLECTIONS = {
  USERS: 'users',
  GAMES: 'games',
  META: 'meta',
  CHARACTERS: 'characters',
  PUBLIC_LOGS: 'publicLogs',
  EVIDENCE: 'evidence',
  INTERROGATIONS: 'interrogations',
  PINS: 'pins',
  CONTRADICTIONS: 'contradictions',
  TRIALS: 'trials',
  INTERNAL: 'internal',
  CASE_TRUTH: 'caseTruth',
  CHARACTER_SECRETS: 'characterSecrets',
  TIMELINE: 'timeline',
  LOG_METADATA: 'logMetadata',
} as const;

/** Cloud Functions リージョン */
export const FUNCTIONS_REGION = 'asia-northeast1';
