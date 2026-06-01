import { FUNCTIONS_REGION } from '@village/shared';
import { onCall } from 'firebase-functions/v2/https';

export { advancePhase } from './functions/advancePhase.js';
export { revealTruth } from './functions/revealTruth.js';
export { startNewGame } from './functions/startNewGame.js';
export { submitInterrogation } from './functions/submitInterrogation.js';
export { submitNightAction } from './functions/submitNightAction.js';
export { submitTrialDecision } from './functions/submitTrialDecision.js';

/** 疎通用 ping (テスト・診断用) */
export const ping = onCall({ region: FUNCTIONS_REGION }, () => {
  return { ok: true, ts: Date.now() };
});
