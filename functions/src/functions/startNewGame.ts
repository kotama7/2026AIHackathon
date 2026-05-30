import type { StartNewGameRequest, StartNewGameResponse } from '@village/shared';
import { FUNCTIONS_REGION } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { userDb } from '../db/admin.js';
import {
  buildDummyCharacters,
  buildDummyEvidence,
  buildDummyLogs,
  buildInitialMeta,
} from '../seed/dummyGame.js';

/**
 * A1-05: startNewGame スタブ実装。
 *
 * - LLM を呼ばずに固定ダミーデータを Firestore に書き込み gameId を返す
 * - Person B の UI 開発を本物のレスポンス形状でブロックしないため
 * - A2-12 で Truth Compiler 実呼び出しに差し替える際は seed/dummyGame.ts を削除する
 */
export const startNewGame = onCall<StartNewGameRequest, Promise<StartNewGameResponse>>(
  { region: FUNCTIONS_REGION, memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'サインインが必要です');
    }

    const gameId = generateGameId();
    logger.info('startNewGame (stub) called', { uid, gameId, payload: request.data });

    const characters = buildDummyCharacters();
    const evidence = buildDummyEvidence(gameId);
    const logs = buildDummyLogs(gameId);
    const meta = buildInitialMeta(uid, gameId);

    // 並列で書き込み
    await Promise.all([
      userDb.meta.set(uid, gameId, meta),
      ...characters.map((c) => userDb.characters.set(uid, gameId, c.id, c)),
      userDb.evidence.addMany(uid, gameId, evidence),
      ...logs.map((l) => userDb.publicLogs.add(uid, gameId, l)),
    ]);

    return {
      gameId,
      meta,
      characters,
      initialEvidence: evidence,
      initialLogs: logs,
    };
  }
);

/** Firestore auto-id 互換の 20 文字 ID */
function generateGameId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
