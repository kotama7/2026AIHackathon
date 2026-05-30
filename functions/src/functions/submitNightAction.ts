import type {
  CharacterPublic,
  GameMeta,
  GameStatus,
  SubmitNightActionRequest,
  SubmitNightActionResponse,
} from '@village/shared';
import { FUNCTIONS_REGION, INITIAL_INTERROGATION_POINTS, MAX_DAYS } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { internalDb, nowTimestamp, userDb } from '../db/admin.js';
import { processNight } from '../gameLoop/night.js';
import { evaluateGameStatus } from '../gameLoop/winLose.js';
import { GEMINI_API_KEY } from '../llm/secrets.js';

/**
 * A3-09: submitNightAction 完成版。
 *
 * フロー:
 *   1. 認証 + 状態検証 (phase=night)
 *   2. 夜間処理 (A3-06)
 *   3. 勝敗判定 (A3-07)
 *   4. 状態遷移: day +1 (ただし MAX_DAYS なら status を確定)
 *      - ポイントを INITIAL_INTERROGATION_POINTS にリセット
 *      - currentPhase = 'morning'
 *   5. レスポンス
 */
export const submitNightAction = onCall<
  SubmitNightActionRequest,
  Promise<SubmitNightActionResponse>
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

    const { gameId, day, watchTargetId } = request.data;

    // ---- 1. state validation ----
    const meta = await userDb.meta.get(uid, gameId);
    if (!meta) {
      throw new HttpsError('not-found', 'ゲームが見つかりません', { code: 'game_not_found' });
    }
    if (meta.currentPhase !== 'night') {
      throw new HttpsError('failed-precondition', '現在は夜フェーズではありません', {
        code: 'invalid_phase',
        currentPhase: meta.currentPhase,
      });
    }
    if (meta.currentDay !== day) {
      throw new HttpsError('failed-precondition', '送られた day が現在の day と一致しません', {
        code: 'invalid_phase',
      });
    }

    const caseTruth = await internalDb.caseTruth.get(gameId);
    if (!caseTruth) {
      throw new HttpsError('not-found', '事件真相データがありません', { code: 'internal_error' });
    }

    // ---- 2. 夜間処理 ----
    const { watchResult, nextDayEvidence, nextDayLogs } = await processNight({
      uid,
      gameId,
      day,
      watchTargetId,
      caseTruth,
    });

    // ---- 3. 勝敗判定 (night_end) ----
    const charactersPublic = await userDb.characters.list(uid, gameId);
    const evalResult = evaluateGameStatus({
      trigger: 'night_end',
      meta,
      characters: charactersPublic,
      caseTruth,
    });

    const gameOver = evalResult.status !== 'in_progress' || day >= MAX_DAYS;
    const finalStatus: GameStatus | undefined = gameOver
      ? evalResult.status === 'in_progress'
        ? 'lost_werewolf_survived' // MAX_DAYS 到達した場合の安全網
        : evalResult.status
      : undefined;

    logger.info('[submitNightAction] eval', {
      gameId,
      day,
      gameOver,
      status: evalResult.status,
      reason: evalResult.reason,
    });

    // ---- 4. 状態遷移 ----
    const patch: Partial<GameMeta> = gameOver
      ? {
          status: finalStatus ?? meta.status,
          currentPhase: 'result',
          updatedAt: nowTimestamp(),
        }
      : {
          currentDay: (day + 1) as GameMeta['currentDay'],
          currentPhase: 'morning',
          remainingPoints: INITIAL_INTERROGATION_POINTS,
          updatedAt: nowTimestamp(),
        };
    await userDb.meta.update(uid, gameId, patch);

    return {
      watchResult,
      nextDayEvidence,
      nextDayLogs,
      gameOver,
      ...(finalStatus ? { finalStatus } : {}),
    };
  }
);

// helper: characters の公開部分を返す (今は使わないが将来再評価用に残す)
export function _toCharacterPublics(input: CharacterPublic[]): CharacterPublic[] {
  return input;
}
