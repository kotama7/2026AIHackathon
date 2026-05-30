/**
 * Truth Compiler (Phase 2 / Person A) の共有型と定数。
 *
 * 設計上の固定ルール:
 * - 生存している AI 住民 (= 容疑者) は 6 人。ID は `char_1` 〜 `char_6` 固定。
 * - 被害者は住民とは別人。ID は `victim_1` 固定 (characters 配列には含めない)。
 * - キャラクターの「知識範囲」= タイムラインイベント ID の集合。
 *   自分が actor のイベント + observedBy に自分を含むイベントの ID。
 *   testimony.knownFactsUsed と character.knownFacts はこの ID で揃える。
 */
import type { CharacterId } from '@village/shared';

// =============================================================================
// SeedConfig — compileCaseTruth の入力
// =============================================================================

export type Difficulty = 'easy' | 'normal' | 'hard';

export type SeedConfig = {
  /** 生成される CaseTruth.caseId。通常は gameId。 */
  caseId: string;
  /** 容疑者数。MVP は 6 固定。 */
  characterCount?: number;
  /** 難易度。MVP は normal を基本とする。 */
  difficulty?: Difficulty;
  /** 多様性シード。過去生成と被らないようプロンプトに混ぜる。 */
  diversitySeed?: string;
};

// =============================================================================
// 固定 ID
// =============================================================================

/** 容疑者 ID を 1..count で生成 (`char_1` 〜)。 */
export function characterIds(count = 6): CharacterId[] {
  return Array.from({ length: count }, (_, i) => `char_${i + 1}`);
}

/** 被害者 ID (住民とは別人)。 */
export const VICTIM_ID = 'victim_1';

/** デフォルトの場所セット (skeleton が独自に決めてもよいが、プロンプト例として使う)。 */
export const SUGGESTED_LOCATIONS: Array<{ id: string; name: string }> = [
  { id: 'private_room', name: '自室' },
  { id: 'lobby', name: 'ロビー' },
  { id: 'clock_tower', name: '時計塔' },
  { id: 'library', name: '図書室' },
  { id: 'courtyard', name: '中庭' },
  { id: 'basement', name: '地下室' },
];

// =============================================================================
// メトリクス収集 (A2-11 / A2-13 で計測に使う)
// =============================================================================

export type StageName =
  | 'skeleton'
  | 'characters'
  | 'timeline'
  | 'evidence'
  | 'testimonies'
  | 'deductionPath'
  | 'validate'
  | 'repair';

export type StageMetrics = {
  stage: StageName;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  /** transport リトライ込みの Gemini 呼び出し回数 */
  geminiAttempts?: number;
  /** スキーマ検証の試行回数 */
  schemaAttempts?: number;
};

/**
 * 各 Generator / Validator / Repairer に渡す共通オプション。
 * - collect: 段階ごとの計測値を受け取るコールバック (compile が集約)
 * - model: モデル上書き (テスト/評価用)
 * - maxAttempts: スキーマ検証込みの最大試行回数
 */
export type GeneratorOptions = {
  collect?: (m: StageMetrics) => void;
  model?: string;
  maxAttempts?: number;
};

// =============================================================================
// CaseDraft — deductionPath 生成 / Validator に渡す検証前の組み立て済み真相
// =============================================================================

import type {
  CaseSkeleton,
  Character,
  DeductionPath,
  Evidence,
  LocationGraph,
  Testimony,
  TimelineEvent,
} from '@village/shared';

/**
 * deductionPath 生成より前の段階で組み立てる「検証前の真相」。
 * validationResult / deductionPath を含まない点が CaseTruth との違い。
 */
export type CaseDraft = {
  caseId: string;
  summary: {
    victimId: CharacterId;
    werewolfId: CharacterId;
    attackTime: string;
    attackLocation: string;
    solutionLogic: string;
  };
  characters: Character[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
  testimonies: Testimony[];
  plannedLies: import('@village/shared').PlannedLie[];
  redHerrings: Array<{ characterId: CharacterId; reason: string }>;
  locationGraph: LocationGraph;
  deductionPath?: DeductionPath;
};

export type { CaseSkeleton, Character, DeductionPath, Evidence, Testimony, TimelineEvent };
