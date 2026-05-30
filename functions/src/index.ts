import { FUNCTIONS_REGION } from '@village/shared';
import { onCall } from 'firebase-functions/v2/https';

export { startNewGame } from './functions/startNewGame.js';

/** 疎通用 ping (テスト・診断用) */
export const ping = onCall({ region: FUNCTIONS_REGION }, () => {
  return { ok: true, ts: Date.now() };
});
