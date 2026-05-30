import { onCall } from 'firebase-functions/v2/https';

export const ping = onCall({ region: 'asia-northeast1' }, () => {
  return { ok: true, ts: Date.now() };
});
