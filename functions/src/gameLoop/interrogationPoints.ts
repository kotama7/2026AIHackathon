import type { GameId, GameMeta, QuestionType, UserId } from '@village/shared';
import { INITIAL_INTERROGATION_POINTS, QUESTION_COSTS } from '@village/shared';
import { HttpsError } from 'firebase-functions/v2/https';

import { runTransaction, userDb } from '../db/admin.js';

export type ConsumePointsResult = {
  /** 消費前 */
  previousPoints: number;
  /** 消費後 */
  remainingPoints: number;
  /** 消費コスト */
  cost: number;
};

/**
 * 質問タイプのコストを返す純関数。
 * shared/constants の QUESTION_COSTS をラップして missing key を防ぐ。
 */
export function getQuestionCost(questionType: QuestionType): number {
  return QUESTION_COSTS[questionType];
}

/**
 * 質問タイプのコストを transaction で atomic に減算。
 *
 * - meta.remainingPoints < cost のとき HttpsError('failed-precondition', 'insufficient_points')
 * - meta が見つからないときは 'not-found'
 *
 * 戻り値で減算前後の値とコストを返す（呼び出し側でレスポンスに使う）。
 */
export async function consumePoints(
  uid: UserId,
  gameId: GameId,
  questionType: QuestionType
): Promise<ConsumePointsResult> {
  const cost = getQuestionCost(questionType);

  return runTransaction(async (tx) => {
    const metaRef = userDb.meta.ref(uid, gameId);
    const snap = await tx.get(metaRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'ゲームが見つかりません', { code: 'game_not_found' });
    }
    const meta = snap.data() as GameMeta;
    if (meta.remainingPoints < cost) {
      throw new HttpsError('failed-precondition', '尋問ポイントが不足しています', {
        code: 'insufficient_points',
        remainingPoints: meta.remainingPoints,
        cost,
      });
    }
    const remainingPoints = meta.remainingPoints - cost;
    tx.update(metaRef, { remainingPoints });
    return { previousPoints: meta.remainingPoints, remainingPoints, cost };
  });
}

/**
 * 日付遷移時にポイントを満タンへ回復。A3-09 (submitNightAction の朝への遷移) で呼ぶ。
 * remainingPoints を INITIAL_INTERROGATION_POINTS にセットするだけ。
 */
export async function refillPointsOnDayChange(uid: UserId, gameId: GameId): Promise<void> {
  await userDb.meta.update(uid, gameId, { remainingPoints: INITIAL_INTERROGATION_POINTS });
}
