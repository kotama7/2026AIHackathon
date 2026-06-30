import type {
  Character,
  CharacterPublic,
  Evidence,
  InterrogationAction,
  SubmitInterrogationRequest,
  SubmitInterrogationResponse,
  Testimony,
} from '@village/shared';
import { FUNCTIONS_REGION } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { internalDb, nowTimestamp, userDb } from '../db/admin.js';
import { generateInterrogationAnswer } from '../gameLoop/interrogation.js';
import { consumePoints } from '../gameLoop/interrogationPoints.js';
import { buildNameById, replaceIdsWithNames } from '../gameLoop/nameSanitize.js';
import { GEMINI_API_KEY } from '../llm/secrets.js';
import {
  applyTrustDelta,
  calculateTrustDelta,
  isCorrectContradiction,
  type TrustAction,
} from '../trust/index.js';

/**
 * A3-08: submitInterrogation 完成版。
 *
 * フロー:
 *   1. 認証 + 状態検証 (game / target 生存 / phase=investigation)
 *   2. ポイント消費 (A3-05)
 *   3. 内部データ取得 (caseTruth, target Character)
 *   4. 回答生成 (A3-02) + 知識ガード (A3-03)
 *   5. 信頼度更新 (A3-04)
 *   6. interrogations/{id} 保存
 *
 * 制限時間目安: 10 秒。
 */
export const submitInterrogation = onCall<
  SubmitInterrogationRequest,
  Promise<SubmitInterrogationResponse>
>(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: 60,
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'サインインが必要です');
    }
    const { gameId, targetId, questionType, questionText, evidenceId, contradictionIds } =
      request.data;

    // ---- 1. state validation ----
    const meta = await userDb.meta.get(uid, gameId);
    if (!meta) {
      throw new HttpsError('not-found', 'ゲームが見つかりません', { code: 'game_not_found' });
    }
    if (meta.currentPhase !== 'investigation') {
      throw new HttpsError('failed-precondition', '現在は尋問フェーズではありません', {
        code: 'invalid_phase',
        currentPhase: meta.currentPhase,
      });
    }
    if (!meta.aliveCharacters.includes(targetId)) {
      throw new HttpsError('failed-precondition', '対象キャラクターは生存していません', {
        code: 'target_not_alive',
      });
    }

    const target = await internalDb.characterSecrets.get(gameId, targetId);
    if (!target) {
      throw new HttpsError('not-found', '対象キャラクターの内部データがありません', {
        code: 'internal_error',
      });
    }

    const caseTruth = await internalDb.caseTruth.get(gameId);
    if (!caseTruth) {
      throw new HttpsError('not-found', '事件真相データがありません', { code: 'internal_error' });
    }

    // ---- 2. ポイント消費 (insufficient_points は HttpsError で投げられる) ----
    const { remainingPoints, cost } = await consumePoints(uid, gameId, questionType);

    // ---- 3. 周辺データ ----
    const presentedEvidence = resolveEvidence(caseTruth.evidence, evidenceId);
    const presentedContradictions = resolveTestimonies(caseTruth.testimonies, contradictionIds);
    const pastUtterances = await fetchPastUtterancesOfTarget(uid, gameId, targetId);

    // ---- 4. 回答生成 ----
    const { output } = await generateInterrogationAnswer({
      target,
      questionType,
      questionText: questionText ?? '',
      ...(presentedEvidence ? { presentedEvidence } : {}),
      ...(presentedContradictions.length > 0 ? { presentedContradictions } : {}),
      pastUtterances,
    });
    // 回答本文に内部ID (char_N) が漏れていたら名前へ置換する (保険)。
    output.utterance = replaceIdsWithNames(output.utterance, buildNameById(caseTruth.characters));

    // ---- 5. 信頼度更新 ----
    const trustAction = pickTrustAction({
      questionType,
      targetId,
      presentedContradictions,
      presentedContradictionIds: contradictionIds ?? [],
    });
    let trustDelta = 0;
    if (trustAction) {
      const delta = calculateTrustDelta(trustAction);
      try {
        await applyTrustDelta(uid, gameId, delta);
      } catch (err) {
        logger.warn('[submitInterrogation] applyTrustDelta failed', { gameId, err: String(err) });
      }
      trustDelta = delta.characterDeltas[targetId] ?? 0;
    }

    // ---- 6. 履歴保存 ----
    const interrogationId = `${gameId}_d${meta.currentDay}_int${Date.now()}`;
    const action: InterrogationAction = {
      id: interrogationId,
      day: meta.currentDay,
      targetId,
      questionType,
      questionText: questionText ?? '',
      ...(evidenceId ? { presentedEvidenceId: evidenceId } : {}),
      ...(contradictionIds && contradictionIds.length > 0
        ? { presentedContradictionIds: contradictionIds }
        : {}),
      cost,
      answerText: output.utterance,
      truthStatus: output.truthStatus,
      trustDelta,
      createdAt: nowTimestamp(),
    };
    await userDb.interrogations.add(uid, gameId, action);

    // ---- 7. 更新後の character を返す ----
    const charRef = userDb.characters.ref(uid, gameId, targetId);
    const charSnap = await charRef.get();
    const updatedCharacter =
      (charSnap.data() as CharacterPublic | undefined) ?? toCharacterPublic(target);

    return {
      interrogationId,
      answer: output.utterance,
      trustDelta,
      remainingPoints,
      updatedCharacter,
    };
  }
);

// =============================================================================
// helpers
// =============================================================================

function resolveEvidence(all: Evidence[], evidenceId?: string): Evidence | undefined {
  if (!evidenceId) return undefined;
  return all.find((e) => e.id === evidenceId);
}

function resolveTestimonies(all: Testimony[], ids?: ReadonlyArray<string>): Testimony[] {
  if (!ids || ids.length === 0) return [];
  const set = new Set(ids);
  return all.filter((t) => set.has(t.id));
}

async function fetchPastUtterancesOfTarget(
  uid: string,
  gameId: string,
  targetId: string
): Promise<string[]> {
  // 過去の自分の interrogation answer と公開ログから target が話した発言を集める
  const snap = await userDb.publicLogs.col(uid, gameId).where('speakerId', '==', targetId).get();
  return snap.docs.map((d) => (d.data() as { text: string }).text).slice(-10);
}

function pickTrustAction(args: {
  questionType: string;
  targetId: string;
  presentedContradictions: Testimony[];
  presentedContradictionIds: ReadonlyArray<string>;
}): TrustAction | null {
  if (args.questionType === 'force_testimony') {
    return { kind: 'force_testimony', targetCharacterId: args.targetId };
  }
  if (args.questionType === 'contradiction') {
    // 正しい矛盾指摘: 提示 ID のうち 1 つでも contradictedBy をカバーする証言があれば correct
    const correct = args.presentedContradictions.some((t) =>
      isCorrectContradiction(args.presentedContradictionIds, t)
    );
    return correct
      ? { kind: 'correct_contradiction', targetCharacterId: args.targetId }
      : { kind: 'wrong_accusation', targetCharacterId: args.targetId };
  }
  return null;
}

function toCharacterPublic(c: Character): CharacterPublic {
  return {
    id: c.id,
    name: c.name,
    publicPersonality: c.publicPersonality,
    speakingStyle: c.speakingStyle,
    socialRole: c.socialRole,
    ...(c.accentColor ? { accentColor: c.accentColor } : {}),
    isAlive: c.isAlive,
    trustToPlayer: c.trustToPlayer,
  };
}
