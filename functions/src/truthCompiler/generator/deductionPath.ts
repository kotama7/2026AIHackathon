/**
 * A2-06: generateDeductionPath。
 * 検証前の真相 (CaseDraft) から、プレイヤーが人狼に到達する推理経路 (DeductionPath) を
 * 1 つ生成し、共有スキーマで検証して返す。
 *
 * caseSkeleton.ts と同じ構造に従う:
 *   1. buildDeductionPathPrompt() でプロンプトを組む
 *   2. generateStructured() で lean な LLM 出力スキーマを満たすまで再試行
 *      (finalTarget / 参照 id / 除外集合の整合を superRefine で強制)
 *   3. 共有スキーマで防御的に再検証
 *   4. opts.collect でメトリクスを通知し、データを返す
 */
import type { DeductionPath } from '@village/shared';
import { schemas } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import { buildDeductionPathPrompt } from '../../llm/prompts/generator/deductionPath.js';
import { generateStructured } from '../../llm/validateAndRetry.js';
import { type CaseDraft, characterIds, type GeneratorOptions } from '../types.js';

const MAX_OUTPUT_TOKENS = 4096;

export async function generateDeductionPath(
  draft: CaseDraft,
  opts: GeneratorOptions = {}
): Promise<DeductionPath> {
  const werewolfId = draft.summary.werewolfId;
  const suspectIds = draft.characters.map((c) => c.id);

  const prompt = buildDeductionPathPrompt({
    werewolfId,
    suspectIds,
    evidence: draft.evidence.map((e) => ({
      id: e.id,
      pointsTo: e.pointsTo,
      category: e.category,
      description: e.description,
    })),
    testimonies: draft.testimonies.map((t) => ({
      id: t.id,
      speaker: t.speakerId,
      truthStatus: t.truthStatus,
      text: t.text,
    })),
    solutionLogic: draft.summary.solutionLogic,
  });

  const result = await generateStructured({
    prompt,
    schema: deductionPathOutputSchema(draft),
    temperature: TEMPERATURE.GENERATOR,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxAttempts: opts.maxAttempts ?? 3,
    ...(opts.model ? { model: opts.model } : {}),
    traceLabel: 'gen/deduction',
  });

  opts.collect?.({
    stage: 'deductionPath',
    durationMs: result.durationMs,
    ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
    ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
    geminiAttempts: result.geminiAttempts,
    schemaAttempts: result.schemaAttempts,
  });

  // 共有スキーマで防御的に再検証 (lean schema と full schema の差分を吸収)
  return schemas.deductionPathSchema.parse(result.data);
}

/**
 * LLM に出させる lean スキーマ。共有 deductionPathSchema に加え、この draft 固有の
 * 整合制約 (finalTarget = 人狼 / 参照 id 実在 / 除外集合が人狼以外の全員を網羅) を
 * superRefine で強制し、壊れた経路なら generateStructured が再試行するようにする。
 */
function deductionPathOutputSchema(draft: CaseDraft) {
  const werewolfId = draft.summary.werewolfId;
  const allSuspects = new Set(
    draft.characters.length > 0 ? draft.characters.map((c) => c.id) : characterIds()
  );
  const evidenceIds = new Set(draft.evidence.map((e) => e.id));
  const testimonyIds = new Set(draft.testimonies.map((t) => t.id));

  return schemas.deductionPathSchema.superRefine((data, ctx) => {
    // finalTarget は人狼に一致
    if (data.finalTarget !== werewolfId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `finalTarget は人狼 ${werewolfId} にしてください`,
        path: ['finalTarget'],
      });
    }

    const excludedUnion = new Set<string>();
    data.steps.forEach((step, i) => {
      for (const evId of step.requiredEvidence) {
        if (!evidenceIds.has(evId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `requiredEvidence "${evId}" は draft に実在しません`,
            path: ['steps', i, 'requiredEvidence'],
          });
        }
      }
      for (const tId of step.requiredTestimonies) {
        if (!testimonyIds.has(tId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `requiredTestimonies "${tId}" は draft に実在しません`,
            path: ['steps', i, 'requiredTestimonies'],
          });
        }
      }
      for (const susp of step.excludedSuspects) {
        if (!allSuspects.has(susp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `excludedSuspects "${susp}" は容疑者に存在しません`,
            path: ['steps', i, 'excludedSuspects'],
          });
        }
        if (susp === werewolfId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `人狼 ${werewolfId} を excludedSuspects に含めないでください`,
            path: ['steps', i, 'excludedSuspects'],
          });
        }
        excludedUnion.add(susp);
      }
    });

    // union(excludedSuspects) ∪ {werewolf} が全容疑者を網羅 (= 人狼以外の全員が除外済み)
    const covered = new Set(excludedUnion);
    covered.add(werewolfId);
    for (const susp of allSuspects) {
      if (!covered.has(susp)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `容疑者 ${susp} が最後まで除外されていません。人狼以外の全員を順次除外してください`,
          path: ['steps'],
        });
      }
    }
  });
}
