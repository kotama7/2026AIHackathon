import type { CharacterPublic } from '../types/character.js';
import type { CharacterId, EvidenceId, GameId, TestimonyId } from '../types/common.js';
import type { DeductionStep } from '../types/deduction.js';
import type { DialogueLog } from '../types/dialogue.js';
import type { EvidencePublic } from '../types/evidence.js';
import type { GameDay, GameMeta, GamePhase, GameStatus } from '../types/game.js';
import type { QuestionType } from '../types/interrogation.js';
import type { TrialDecision, Verdict } from '../types/trial.js';

// =========================================================
// Callable 関数名 (string literal union で集約)
// =========================================================

export const FUNCTION_NAMES = [
  'startNewGame',
  'advancePhase',
  'submitInterrogation',
  'advanceToTrial',
  'submitTrialDecision',
  'submitNightAction',
  'revealTruth',
] as const;

export type FunctionName = (typeof FUNCTION_NAMES)[number];

// =========================================================
// 共通エラーコード
// =========================================================

export type FunctionErrorCode =
  | 'unauthenticated'
  | 'permission_denied'
  | 'game_not_found'
  | 'invalid_phase'
  | 'insufficient_points'
  | 'target_not_alive'
  | 'evidence_not_found'
  | 'too_many_evidence'
  | 'too_many_contradictions'
  | 'llm_failure'
  | 'truth_compiler_failure'
  | 'schema_validation_failure'
  | 'internal_error';

// =========================================================
// startNewGame
// =========================================================

export type StartNewGameRequest = {
  /** 難易度 (MVP では normal のみ実装) */
  difficulty?: 'easy' | 'normal' | 'hard';
  /** true でデモ用シードゲームを起動 (Truth Compiler を呼ばない) */
  useSeed?: boolean;
};

export type StartNewGameResponse = {
  gameId: GameId;
  meta: GameMeta;
  characters: CharacterPublic[];
  /** Day 1 朝の時点で公開される証拠 */
  initialEvidence: EvidencePublic[];
  /** Day 1 議論ログの先頭数件 (残りはストリーミングで Firestore listener 経由) */
  initialLogs: DialogueLog[];
};

// =========================================================
// submitInterrogation
// =========================================================

export type SubmitInterrogationRequest = {
  gameId: GameId;
  targetId: CharacterId;
  questionType: QuestionType;
  /** 自由入力対応する場合の質問本文。MVP は選択式 (空文字で OK) */
  questionText?: string;
  /** questionType === 'evidence' の場合に必須 */
  evidenceId?: EvidenceId;
  /** questionType === 'contradiction' の場合に必須 */
  contradictionIds?: (TestimonyId | string)[];
};

export type SubmitInterrogationResponse = {
  interrogationId: string;
  answer: string;
  trustDelta: number;
  remainingPoints: number;
  /** 信頼度更新後のキャラクター (UI 表示用) */
  updatedCharacter: CharacterPublic;
};

// =========================================================
// advancePhase — フェーズ前進オーケストレーション (A3-00)
// =========================================================

export type AdvancePhaseRequest = {
  gameId: GameId;
};

export type AdvancePhaseResponse = {
  /** 更新後の meta */
  meta: GameMeta;
  /** 更新後の現在フェーズ */
  phase: GamePhase;
};

// =========================================================
// advanceToTrial
// =========================================================

export type AdvanceToTrialRequest = {
  gameId: GameId;
  day: GameDay;
};

export type AdvanceToTrialResponse = {
  /** 現在生存している容疑者候補 */
  candidates: CharacterPublic[];
  /** 提示可能な証拠の上限 */
  maxEvidence: number;
  /** 提示可能な矛盾の上限 */
  maxContradictions: number;
};

// =========================================================
// submitTrialDecision
// =========================================================

export type SubmitTrialDecisionRequest = {
  gameId: GameId;
  day: GameDay;
  suspectId: CharacterId;
  presentedEvidence: EvidenceId[];
  presentedContradictions: (TestimonyId | string)[];
  verdict: Verdict;
};

export type SubmitTrialDecisionResponse = {
  /** 容疑者の弁明 (LLM 生成) */
  defense: string;
  /** 他キャラの反応 */
  reactions: TrialDecision['reactions'];
  /** verdict が execute の場合: 人狼を当てたか */
  wasCorrect?: boolean;
  /** この判決でゲームが終了したか */
  outcome: 'continue' | 'won' | 'lost';
  /** 終了した場合の最終ステータス */
  finalStatus?: GameStatus;
};

// =========================================================
// submitNightAction
// =========================================================

export type SubmitNightActionRequest = {
  gameId: GameId;
  day: GameDay;
  watchTargetId: CharacterId;
};

export type SubmitNightActionResponse = {
  /** 監視結果 (自然言語、UI で翌朝モーダル表示) */
  watchResult: string;
  /** 翌朝に追加される証拠 */
  nextDayEvidence: EvidencePublic[];
  /** 翌朝の初期議論ログ */
  nextDayLogs: DialogueLog[];
  /** ゲーム終了フラグ (Day 3 night 後 or 村人壊滅時) */
  gameOver: boolean;
  finalStatus?: GameStatus;
};

// =========================================================
// revealTruth
// =========================================================

export type RevealTruthRequest = {
  gameId: GameId;
};

export type ScoreBreakdown = {
  werewolfIdentified: boolean;
  daysElapsed: number;
  wrongExecutions: number;
  survivingVillagers: number;
  /** 1 ポイントあたりに獲得した有効情報量の指標 */
  interrogationEfficiency: number;
  correctContradictions: number;
  wrongContradictions: number;
  finalVillageTrust: number;
};

export type ScoreRank = 'S' | 'A' | 'B' | 'C' | 'D';

export type RevealTruthResponse = {
  /** 真の人狼 */
  werewolf: CharacterPublic;
  /** LLM が生成した結末の文章 */
  truthSummary: string;
  /** 各キャラの秘密と動機 (開示済み) */
  characterReveals: Array<{
    character: CharacterPublic;
    secret: string;
    privateGoal: string;
    fear: string;
  }>;
  /** 嘘の理由一覧 */
  lieReveals: Array<{
    speakerId: CharacterId;
    content: string;
    reason: string;
    hiddenTruth: string;
  }>;
  /** 証拠の真の意味 */
  evidenceReveals: Array<{
    evidence: EvidencePublic;
    trueInterpretation: string;
  }>;
  /** 推理経路と、プレイヤーが各 step に必要な情報を取得済みだったか */
  deductionPath: Array<
    DeductionStep & {
      playerHadAllEvidence: boolean;
      playerHadAllTestimonies: boolean;
    }
  >;
  score: ScoreBreakdown;
  rank: ScoreRank;
};

// =========================================================
// 関数名 → Req/Res 型の対応表 (typed callable 用)
// =========================================================

export type FunctionContracts = {
  startNewGame: { req: StartNewGameRequest; res: StartNewGameResponse };
  advancePhase: { req: AdvancePhaseRequest; res: AdvancePhaseResponse };
  submitInterrogation: {
    req: SubmitInterrogationRequest;
    res: SubmitInterrogationResponse;
  };
  advanceToTrial: { req: AdvanceToTrialRequest; res: AdvanceToTrialResponse };
  submitTrialDecision: {
    req: SubmitTrialDecisionRequest;
    res: SubmitTrialDecisionResponse;
  };
  submitNightAction: { req: SubmitNightActionRequest; res: SubmitNightActionResponse };
  revealTruth: { req: RevealTruthRequest; res: RevealTruthResponse };
};
