import type {
  AdvancePhaseRequest,
  AdvancePhaseResponse,
  GameDay,
  GameMeta,
  GamePhase,
} from '@village/shared';
import { FUNCTIONS_REGION, INITIAL_INTERROGATION_POINTS } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { nowTimestamp, userDb } from '../db/admin.js';

/**
 * A3-00: フェーズ前進オーケストレーション。
 *
 * `meta.currentPhase` を状態機械に沿って 1 段階前進させる (決定論的・LLM 非依存)。
 * クライアントは meta を直接書けない (rules) ため、前進は必ずこの callable 経由。
 *
 *   morning → discussion → investigation → organize → trial → night
 *   night 完了: day < 3 なら翌朝 (currentDay++, ポイント回復) / day == 3 なら result
 *
 * 各フェーズ進入時の LLM 生成 (議論 A3-01 / 夜手がかり A3-06) は段階2で接続予定。
 * 本 MVP は phase ポインタの前進のみを担い、無料枠 quota に依存せず進行できる。
 */

/** 前進順 (night の次は別ロジックで分岐) */
const FORWARD: GamePhase[] = [
  'morning',
  'discussion',
  'investigation',
  'organize',
  'trial',
  'night',
];

const MAX_DAY = 3;

type NextState = {
  phase: GamePhase;
  day: GameDay;
  resetPoints: boolean;
};

function computeNext(meta: GameMeta): NextState {
  const { currentPhase: phase, currentDay: day } = meta;

  if (phase === 'night') {
    // 夜の後: 日数が残っていれば翌朝へ (ポイント回復)、なければ終了
    if (day < MAX_DAY) {
      return { phase: 'morning', day: (day + 1) as GameDay, resetPoints: true };
    }
    return { phase: 'result', day, resetPoints: false };
  }

  const idx = FORWARD.indexOf(phase);
  if (idx === -1 || idx >= FORWARD.length - 1) {
    // 不明 or 既に night 以降 → 据え置き (冪等)
    return { phase, day, resetPoints: false };
  }
  return { phase: FORWARD[idx + 1]!, day, resetPoints: false };
}

export const advancePhase = onCall<AdvancePhaseRequest, Promise<AdvancePhaseResponse>>(
  { region: FUNCTIONS_REGION },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'サインインが必要です');
    }
    const gameId = request.data?.gameId;
    if (!gameId) {
      throw new HttpsError('invalid-argument', 'gameId が必要です');
    }

    const meta = await userDb.meta.get(uid, gameId);
    if (!meta) {
      throw new HttpsError('not-found', 'ゲームが見つかりません');
    }

    // 終局済みなら何もしない
    if (meta.status !== 'in_progress') {
      return { meta, phase: meta.currentPhase };
    }

    const next = computeNext(meta);
    if (next.phase === meta.currentPhase && next.day === meta.currentDay) {
      return { meta, phase: meta.currentPhase }; // 冪等 no-op
    }

    const patch: Partial<GameMeta> = {
      currentPhase: next.phase,
      updatedAt: nowTimestamp(),
    };
    if (next.day !== meta.currentDay) patch.currentDay = next.day;
    if (next.resetPoints) patch.remainingPoints = INITIAL_INTERROGATION_POINTS;

    await userDb.meta.update(uid, gameId, patch);
    logger.info('advancePhase', {
      gameId,
      from: meta.currentPhase,
      to: next.phase,
      day: next.day,
    });

    return { meta: { ...meta, ...patch }, phase: next.phase };
  }
);
