'use client';

import type {
  AdvancePhaseRequest,
  AdvancePhaseResponse,
  AdvanceToTrialRequest,
  AdvanceToTrialResponse,
  FunctionContracts,
  FunctionErrorCode,
  FunctionName,
  RevealTruthRequest,
  RevealTruthResponse,
  StartNewGameRequest,
  StartNewGameResponse,
  SubmitInterrogationRequest,
  SubmitInterrogationResponse,
  SubmitNightActionRequest,
  SubmitNightActionResponse,
  SubmitTrialDecisionRequest,
  SubmitTrialDecisionResponse,
} from '@village/shared';
import { httpsCallable } from 'firebase/functions';

import { getFunctions } from './client';
import * as mock from './functionsMock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/** API エラー (FirebaseError を FunctionErrorCode にマップしたもの) */
export class FunctionsApiError extends Error {
  constructor(
    public readonly code: FunctionErrorCode,
    message: string,
    public readonly originalCode?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'FunctionsApiError';
  }
}

/** Firebase 標準コード → 本プロジェクトの FunctionErrorCode への粗いマッピング */
const STANDARD_CODE_MAP: Record<string, FunctionErrorCode> = {
  'functions/unauthenticated': 'unauthenticated',
  'functions/permission-denied': 'permission_denied',
  'functions/not-found': 'game_not_found',
  'functions/failed-precondition': 'invalid_phase',
  'functions/invalid-argument': 'schema_validation_failure',
  'functions/internal': 'internal_error',
  'functions/unavailable': 'internal_error',
  'functions/deadline-exceeded': 'llm_failure',
  'functions/resource-exhausted': 'insufficient_points',
};

function mapFirebaseError(err: unknown): FunctionsApiError {
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: string; message?: string; details?: unknown };
    const originalCode = e.code;
    const message = e.message ?? 'Unknown error from Cloud Functions';

    // 1) details に具体コードがある場合はそれを優先
    if (
      e.details &&
      typeof e.details === 'object' &&
      'code' in e.details &&
      typeof (e.details as { code: unknown }).code === 'string'
    ) {
      return new FunctionsApiError(
        (e.details as { code: string }).code as FunctionErrorCode,
        message,
        originalCode,
        e.details,
      );
    }

    // 2) 標準コードからマップ
    const mapped: FunctionErrorCode =
      (originalCode ? STANDARD_CODE_MAP[originalCode] : undefined) ??
      'internal_error';
    return new FunctionsApiError(mapped, message, originalCode, e.details);
  }

  return new FunctionsApiError(
    'internal_error',
    err instanceof Error ? err.message : String(err),
  );
}

/** 型付き callable を作る低レベルヘルパー */
function makeCallable<N extends FunctionName>(name: N) {
  return async (
    req: FunctionContracts[N]['req'],
  ): Promise<FunctionContracts[N]['res']> => {
    try {
      const fn = httpsCallable<
        FunctionContracts[N]['req'],
        FunctionContracts[N]['res']
      >(getFunctions(), name);
      const result = await fn(req);
      return result.data;
    } catch (err) {
      const apiErr = mapFirebaseError(err);
      // サーバ側エラー (Gemini/Truth Compiler 失敗 = truth_compiler_failure / llm_failure を含む)
      // を握りつぶさず console に明示する。フォールバック時もここで可視化される。
      console.error(
        `[functions:${name}] failed — code=${apiErr.code}` +
          (apiErr.originalCode ? ` (firebase=${apiErr.originalCode})` : '') +
          `: ${apiErr.message}`,
        apiErr.details ?? '',
      );
      throw apiErr;
    }
  };
}

// =========================================================
// Wrapper 関数 (real / mock 自動切替)
// =========================================================

const realStartNewGame = makeCallable('startNewGame');
const realAdvancePhase = makeCallable('advancePhase');
const realSubmitInterrogation = makeCallable('submitInterrogation');
const realAdvanceToTrial = makeCallable('advanceToTrial');
const realSubmitTrialDecision = makeCallable('submitTrialDecision');
const realSubmitNightAction = makeCallable('submitNightAction');
const realRevealTruth = makeCallable('revealTruth');

export async function callStartNewGame(
  req: StartNewGameRequest = {},
): Promise<StartNewGameResponse> {
  if (USE_MOCK) return mock.mockStartNewGame(req);
  return realStartNewGame(req);
}

export async function callAdvancePhase(
  req: AdvancePhaseRequest,
): Promise<AdvancePhaseResponse> {
  if (USE_MOCK) return mock.mockAdvancePhase(req);
  return realAdvancePhase(req);
}

export async function callSubmitInterrogation(
  req: SubmitInterrogationRequest,
): Promise<SubmitInterrogationResponse> {
  if (USE_MOCK) return mock.mockSubmitInterrogation(req);
  return realSubmitInterrogation(req);
}

export async function callAdvanceToTrial(
  req: AdvanceToTrialRequest,
): Promise<AdvanceToTrialResponse> {
  if (USE_MOCK) return mock.mockAdvanceToTrial(req);
  return realAdvanceToTrial(req);
}

export async function callSubmitTrialDecision(
  req: SubmitTrialDecisionRequest,
): Promise<SubmitTrialDecisionResponse> {
  if (USE_MOCK) return mock.mockSubmitTrialDecision(req);
  return realSubmitTrialDecision(req);
}

export async function callSubmitNightAction(
  req: SubmitNightActionRequest,
): Promise<SubmitNightActionResponse> {
  if (USE_MOCK) return mock.mockSubmitNightAction(req);
  return realSubmitNightAction(req);
}

export async function callRevealTruth(
  req: RevealTruthRequest,
): Promise<RevealTruthResponse> {
  if (USE_MOCK) return mock.mockRevealTruth(req);
  return realRevealTruth(req);
}

/** 開発時に現モードを確認するためのフラグ (UI で表示しても良い) */
export const FUNCTIONS_MOCK_MODE = USE_MOCK;
