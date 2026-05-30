import type {
  Character,
  Evidence,
  SubmitTrialDecisionRequest,
  SubmitTrialDecisionResponse,
  Testimony,
} from '@village/shared';
import { FUNCTIONS_REGION } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { internalDb, userDb } from '../db/admin.js';
import { generateDefense } from '../gameLoop/defense.js';
import { generateReactions } from '../gameLoop/reactions.js';
import { processVerdict } from '../gameLoop/verdict.js';
import { GEMINI_API_KEY } from '../llm/secrets.js';

const MAX_PRESENTED_EVIDENCE = 3;
const MAX_PRESENTED_CONTRADICTIONS = 2;

/**
 * A4-05: submitTrialDecision 完成版。
 *
 * フロー (目標: 15 秒以内):
 *   1. 認証 + 状態検証 (phase=trial、提示数上限)
 *   2. caseTruth + 容疑者 Character 取得
 *   3. 弁明生成 (A4-01)
 *   4. 反応生成 (A4-02) — 生存キャラ (容疑者除く) を並列
 *   5. 判決処理 (A4-03)
 *   6. レスポンス
 */
export const submitTrialDecision = onCall<
  SubmitTrialDecisionRequest,
  Promise<SubmitTrialDecisionResponse>
>(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'サインインが必要です');

    const { gameId, day, suspectId, presentedEvidence, presentedContradictions, verdict } =
      request.data;

    // ---- 1. validation ----
    if (presentedEvidence.length > MAX_PRESENTED_EVIDENCE) {
      throw new HttpsError(
        'failed-precondition',
        `提示できる証拠は ${MAX_PRESENTED_EVIDENCE} 件までです`,
        { code: 'too_many_evidence' }
      );
    }
    if (presentedContradictions.length > MAX_PRESENTED_CONTRADICTIONS) {
      throw new HttpsError(
        'failed-precondition',
        `提示できる矛盾は ${MAX_PRESENTED_CONTRADICTIONS} 件までです`,
        { code: 'too_many_contradictions' }
      );
    }

    const meta = await userDb.meta.get(uid, gameId);
    if (!meta) {
      throw new HttpsError('not-found', 'ゲームが見つかりません', { code: 'game_not_found' });
    }
    if (meta.currentPhase !== 'trial') {
      throw new HttpsError('failed-precondition', '現在は裁判フェーズではありません', {
        code: 'invalid_phase',
        currentPhase: meta.currentPhase,
      });
    }
    if (meta.currentDay !== day) {
      throw new HttpsError('failed-precondition', '送られた day が現在の day と一致しません', {
        code: 'invalid_phase',
      });
    }
    if (!meta.aliveCharacters.includes(suspectId)) {
      throw new HttpsError('failed-precondition', '容疑者は既に生存していません', {
        code: 'target_not_alive',
      });
    }

    // ---- 2. 内部データ ----
    const [caseTruth, suspect] = await Promise.all([
      internalDb.caseTruth.get(gameId),
      internalDb.characterSecrets.get(gameId, suspectId),
    ]);
    if (!caseTruth) {
      throw new HttpsError('not-found', '事件真相データがありません', { code: 'internal_error' });
    }
    if (!suspect) {
      throw new HttpsError('not-found', '容疑者の内部データがありません', {
        code: 'internal_error',
      });
    }

    const evidenceMap = new Map(caseTruth.evidence.map((e) => [e.id, e] as const));
    const presentedEvidenceFull: Evidence[] = presentedEvidence
      .map((id) => evidenceMap.get(id))
      .filter((e): e is Evidence => Boolean(e));
    if (presentedEvidenceFull.length !== presentedEvidence.length) {
      throw new HttpsError('not-found', '提示された証拠の一部が見つかりません', {
        code: 'evidence_not_found',
      });
    }

    const testimonyMap = new Map(caseTruth.testimonies.map((t) => [t.id, t] as const));
    const presentedContradictionsFull: Testimony[] = presentedContradictions
      .map((id) => testimonyMap.get(id))
      .filter((t): t is Testimony => Boolean(t));

    // 反応するキャラ: 生存 + 容疑者除外
    const aliveIds = new Set(meta.aliveCharacters);
    const reactorIds = caseTruth.characters
      .filter((c) => c.id !== suspectId && aliveIds.has(c.id))
      .map((c) => c.id);
    const reactors: Character[] = reactorIds
      .map((id) => caseTruth.characters.find((c) => c.id === id))
      .filter((c): c is Character => Boolean(c));

    // ---- 3. 弁明生成 ----
    const { defenseText, output: defenseOutput } = await generateDefense({
      suspect,
      presentedEvidence: presentedEvidenceFull,
      presentedContradictions: presentedContradictionsFull,
    });
    logger.info('[submitTrialDecision] defense generated', {
      gameId,
      suspectId,
      truthStatus: defenseOutput.truthStatus,
    });

    // ---- 4. 反応生成 (並列) ----
    const { reactions } = await generateReactions({ suspect, reactors, defenseText });

    // ---- 5. 判決処理 ----
    const verdictResult = await processVerdict({
      uid,
      gameId,
      day,
      suspectId,
      verdict,
      presentedEvidence,
      presentedContradictions,
      defenseText,
      reactions,
      caseTruth,
    });

    // ---- 6. レスポンス ----
    return {
      defense: defenseText,
      reactions,
      ...(verdictResult.wasCorrect !== undefined ? { wasCorrect: verdictResult.wasCorrect } : {}),
      outcome: verdictResult.outcome,
      ...(verdictResult.finalStatus ? { finalStatus: verdictResult.finalStatus } : {}),
    };
  }
);
