/**
 * A2-10: Repairer。Validator の指摘を受けて CaseTruth を最小修正する。
 *
 * 方針 (要件 §5.3 / §7.4):
 * - LLM に RFC 6902 の JSON Patch を出させ、差分だけを当てる (全体再生成しない)。
 * - 当てた後は caseTruthSchema で再検証。スキーマを満たさない / 人狼・被害者が変わって
 *   しまった patch は破棄し、applied=false (上位で再生成) とする。
 * - patch が空 or 適用失敗の場合も applied=false を返す。
 */
import type { CaseTruth, ValidationIssue } from '@village/shared';
import { schemas } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import { TEMPERATURE } from '../llm/geminiClient.js';
import { buildRepairPrompt } from '../llm/prompts/repairer/repair.js';
import { generateStructured } from '../llm/validateAndRetry.js';
import { applyJsonPatch, type JsonPatchOp } from './jsonPatch.js';
import type { GeneratorOptions } from './types.js';

export type RepairResult = {
  /** 修正後 (applied=true) または元のまま (applied=false) の CaseTruth */
  repaired: CaseTruth;
  /** patch を当てて再検証に通ったか */
  applied: boolean;
  /** 今回は直せなかった不備 (上位で再生成の判断に使う) */
  unrepairable: ValidationIssue[];
  durationMs: number;
};

const patchOutputSchema = z.object({
  patches: z.array(
    z.object({
      op: z.enum(['add', 'replace', 'remove']),
      path: z.string(),
      value: z.unknown().optional(),
    })
  ),
});

export async function repair(
  truth: CaseTruth,
  issues: ValidationIssue[],
  opts: GeneratorOptions = {}
): Promise<RepairResult> {
  const startedAt = Date.now();
  const errorIssues = issues.filter((i) => i.severity === 'error');

  const fail = (): RepairResult => ({
    repaired: truth,
    applied: false,
    unrepairable: errorIssues,
    durationMs: Date.now() - startedAt,
  });

  if (errorIssues.length === 0) {
    return { repaired: truth, applied: true, unrepairable: [], durationMs: Date.now() - startedAt };
  }

  let patches: JsonPatchOp[];
  try {
    const result = await generateStructured({
      prompt: buildRepairPrompt({ truth, issues: errorIssues }),
      schema: patchOutputSchema,
      temperature: TEMPERATURE.VALIDATOR,
      // patch の value に secret 等の長い日本語文字列が入ると 2048 では出力が途中で切れ、
      // "Unterminated string" でパース失敗→修復不能→全体 regen ループ→関数タイムアウトに陥る。
      // 余裕を持たせて切断を防ぐ。
      maxOutputTokens: 8192,
      maxAttempts: opts.maxAttempts ?? 2,
      ...(opts.model ? { model: opts.model } : {}),
      traceLabel: 'repair',
    });
    opts.collect?.({
      stage: 'repair',
      durationMs: result.durationMs,
      ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
      ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
      geminiAttempts: result.geminiAttempts,
      schemaAttempts: result.schemaAttempts,
    });
    patches = result.data.patches;
  } catch (e) {
    logger.warn('[repair] LLM failed to produce patches', { err: String(e) });
    return fail();
  }

  if (patches.length === 0) {
    logger.info('[repair] LLM returned no patches (unrepairable)');
    return fail();
  }

  const applied = applyJsonPatch(truth, patches);
  if (!applied.ok) {
    logger.warn('[repair] patch application failed', {
      error: applied.error,
      op: applied.failedOp,
    });
    return fail();
  }

  // ロック (人狼/被害者) が動いていないか + スキーマ再検証
  const parsed = schemas.caseTruthSchema.safeParse(applied.doc);
  if (!parsed.success) {
    logger.warn('[repair] patched CaseTruth failed schema re-validation', {
      issues: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`),
    });
    return fail();
  }
  if (
    parsed.data.summary.werewolfId !== truth.summary.werewolfId ||
    parsed.data.summary.victimId !== truth.summary.victimId
  ) {
    logger.warn('[repair] patch changed locked werewolf/victim — rejected');
    return fail();
  }

  return {
    repaired: parsed.data,
    applied: true,
    unrepairable: [],
    durationMs: Date.now() - startedAt,
  };
}
