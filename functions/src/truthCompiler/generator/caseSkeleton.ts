/**
 * A2-01: generateCaseSkeleton。
 * 事件骨格 (要件 §6.1) を 1 つ生成し、CaseSkeleton スキーマで検証して返す。
 *
 * このファイルは Truth Compiler Generator 群の「リファレンス実装」。
 * 他の generator も同じ構造に従う:
 *   1. buildXxxPrompt() でプロンプトを組む
 *   2. generateStructured() で lean な LLM 出力スキーマを満たすまで再試行
 *   3. コードで機械的フィールド (固定 ID / デフォルト値) を注入し full 型へ組み立て
 *   4. 共有スキーマで防御的に再検証
 *   5. opts.collect でメトリクスを通知し、データを返す
 */
import type { CaseSkeleton } from '@village/shared';
import { schemas } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import { buildCaseSkeletonPrompt } from '../../llm/prompts/generator/caseSkeleton.js';
import { generateStructured } from '../../llm/validateAndRetry.js';
import { characterIds, type GeneratorOptions, type SeedConfig, VICTIM_ID } from '../types.js';

const MAX_OUTPUT_TOKENS = 2048;

export async function generateCaseSkeleton(
  seed: SeedConfig,
  opts: GeneratorOptions = {}
): Promise<CaseSkeleton> {
  const characterCount = seed.characterCount ?? 6;
  const ids = characterIds(characterCount);

  const prompt = buildCaseSkeletonPrompt({
    characterCount,
    difficulty: seed.difficulty ?? 'normal',
    characterIds: ids,
    victimId: VICTIM_ID,
    diversitySeed: seed.diversitySeed,
  });

  const result = await generateStructured({
    prompt,
    schema: skeletonOutputSchema,
    temperature: TEMPERATURE.GENERATOR,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxAttempts: opts.maxAttempts ?? 3,
    ...(opts.model ? { model: opts.model } : {}),
    traceLabel: 'gen/skeleton',
  });

  opts.collect?.({
    stage: 'skeleton',
    durationMs: result.durationMs,
    ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
    ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
    geminiAttempts: result.geminiAttempts,
    schemaAttempts: result.schemaAttempts,
  });

  // 共有スキーマで防御的に再検証 (lean schema と full schema の差分を吸収)
  return schemas.caseSkeletonSchema.parse(result.data);
}

/**
 * LLM に出させる lean スキーマ。共有 caseSkeletonSchema とほぼ同じだが、
 * victimId を固定値に強制する。
 */
const skeletonOutputSchema = schemas.caseSkeletonSchema
  .extend({
    victimId: z.literal(VICTIM_ID),
  })
  .superRefine((data, ctx) => {
    if (data.werewolfId === data.redHerringCharacterId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'werewolfId と redHerringCharacterId は別人にしてください',
        path: ['redHerringCharacterId'],
      });
    }
    if (!data.locationGraph.locations.includes(data.attackLocation)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'attackLocation は locationGraph.locations に含めてください',
        path: ['attackLocation'],
      });
    }
  });
