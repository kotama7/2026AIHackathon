import type { Character } from './character.js';
import type { CharacterId, GameId, LocationId } from './common.js';
import type { DeductionPath } from './deduction.js';
import type { Evidence } from './evidence.js';
import type { Testimony } from './testimony.js';
import type { LocationGraph, TimelineEvent } from './timeline.js';

/**
 * 事件骨格 (要件 §6.1)。Generator の第一段階で生成される。
 */
export type CaseSkeleton = {
  werewolfId: CharacterId;
  victimId: CharacterId;
  /** "HH:MM" */
  attackTime: string;
  attackLocation: LocationId;
  /** 襲撃経路の説明 (人狼の動線) */
  attackRoute: string;
  /** 主要証拠タイプ (例: ["door_log", "footprint", "torn_note"]) */
  primaryEvidenceTypes: string[];
  /** レッドヘリングとなる村人 */
  redHerringCharacterId: CharacterId;
  /** レッドヘリングが怪しく見える理由 (Validator が motivation で検証) */
  redHerringReason: string;
  /** 想定される最終的な推理経路の概要 (自然言語) */
  solutionLogic: string;
  /** 場所の隣接情報 */
  locationGraph: LocationGraph;
};

/**
 * 検証結果。Validator が出力、Repairer が読む。
 */
export type ValidationIssue = {
  category: 'deducibility' | 'logic' | 'motivation' | 'schema';
  severity: 'error' | 'warning';
  message: string;
  /** 関連エンティティ ID 群 (修正のヒント) */
  relatedIds?: string[];
};

export type ValidationResult = {
  passed: boolean;
  issues: ValidationIssue[];
  /** 集計スコア (deducibility のみ) */
  scores?: Record<CharacterId, number>;
  /** Validator の実行所要時間 (ms) */
  durationMs?: number;
};

/**
 * 計画された嘘の記録 (要件 §6.3)。
 * すべての嘘には理由と崩し方が必須。internal/ にのみ保存。
 */
export type PlannedLie = {
  liarId: CharacterId;
  /** 嘘の内容 */
  content: string;
  /** 嘘をつく理由 */
  reason: string;
  /** 隠したい真実 */
  hiddenTruth: string;
  /** この嘘を崩す証拠/証言 ID 群 */
  contradictedBy: string[];
  /** 嘘が崩れたときの反応方針 */
  reactionWhenExposed: string;
};

/**
 * Truth Compiler が最終的に固定する真相全体 (要件 §12.1)。
 * internal/{gameId}/caseTruth に保存され、ゲーム進行中は変更されない。
 */
export type CaseTruth = {
  caseId: GameId;
  summary: {
    victimId: CharacterId;
    werewolfId: CharacterId;
    /** "HH:MM" */
    attackTime: string;
    attackLocation: LocationId;
    solutionLogic: string;
  };
  characters: Character[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
  testimonies: Testimony[];
  plannedLies: PlannedLie[];
  /** レッドヘリング (キャラ ID と理由) */
  redHerrings: Array<{ characterId: CharacterId; reason: string }>;
  deductionPath: DeductionPath;
  locationGraph: LocationGraph;
  /** 最終的に通った検証結果 */
  validationResult: ValidationResult;
};
