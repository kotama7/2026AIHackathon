import { logger } from 'firebase-functions/v2';

import { GeminiQuotaError } from './errors.js';

/**
 * Gemini 呼び出しの「1 日あたりリクエスト数」ハードキャップ (多層防御)。
 *
 * 無料枠 (billing 無しプロジェクト) では超過しても課金は発生しないが、
 * デモ中に 429 を連発しないよう・想定外の浪費を防ぐために自前で上限を設ける。
 *
 * 有効化は環境変数 `LLM_DAILY_REQUEST_LIMIT` に正の整数を設定するだけ。
 *   - 未設定 / 0 / 不正値 → 完全 no-op (Firestore も触らない)
 *   - 設定あり → internal/_llmUsage に日次カウンタを持ち、transaction で atomic に増分
 *
 * カウンタ doc: internal/_llmUsage { day: 'YYYY-MM-DD', count: number }
 */
const USAGE_DOC_PATH = 'internal/_llmUsage';

/** UTC 基準の YYYY-MM-DD。日付境界がブレないよう UTC で固定する。 */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 設定された日次上限。未設定/不正なら null (= 無効)。 */
function dailyLimit(): number | null {
  const raw = process.env.LLM_DAILY_REQUEST_LIMIT;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/**
 * 1 リクエスト分を消費する。上限到達なら GeminiQuotaError を throw。
 * 上限未設定なら即 return (副作用なし)。callGemini の先頭で呼ぶ。
 */
export async function enforceDailyLlmQuota(): Promise<void> {
  const limit = dailyLimit();
  if (limit == null) return;

  // 無効時に firebase-admin を読み込まないよう遅延 import
  const { adminDb, runTransaction } = await import('../db/admin.js');
  const ref = adminDb.doc(USAGE_DOC_PATH);
  const day = todayKey();

  const allowed = await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { day?: string; count?: number } | undefined;
    const current = data?.day === day ? (data.count ?? 0) : 0;
    if (current >= limit) return false;
    tx.set(ref, { day, count: current + 1 }, { merge: true });
    return true;
  });

  if (!allowed) {
    logger.error('[llm-quota] daily request limit reached', { limit, day });
    throw new GeminiQuotaError(limit);
  }
}
