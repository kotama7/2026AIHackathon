/**
 * A2-04: generateEvidence。
 * 要件 §6.4 の 3 階層証拠 (確定 / 補助 / ノイズ) を生成し、
 * 各証拠を timeline event に紐づける。
 *
 * caseSkeleton.ts と同じ構造:
 *   1. buildEvidencePrompt() でプロンプトを組む
 *   2. generateStructured() で lean な出力スキーマ (id 抜き) を満たすまで再試行
 *   3. コードで id (ev_{i+1}) を採番して full Evidence へ組み立て
 *   4. 共有 evidenceSchema 配列で防御的に再検証
 *   5. opts.collect でメトリクスを通知して返す
 */
import type { CaseSkeleton, Character, Evidence, TimelineEvent } from '@village/shared';
import { DEDUCIBILITY_THRESHOLDS, EVIDENCE_WEIGHT_DEFAULTS, schemas } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import { buildEvidencePrompt } from '../../llm/prompts/generator/evidence.js';
import { generateStructured } from '../../llm/validateAndRetry.js';
import type { GeneratorOptions } from '../types.js';

const MAX_OUTPUT_TOKENS = 8192;

export async function generateEvidence(
  skeleton: CaseSkeleton,
  timeline: TimelineEvent[],
  characters: Character[],
  opts: GeneratorOptions = {}
): Promise<Evidence[]> {
  const timelineIds = new Set(timeline.map((e) => e.id));

  const prompt = buildEvidencePrompt({
    skeleton,
    characters,
    timeline,
    scoreTargets: {
      werewolfMin: DEDUCIBILITY_THRESHOLDS.WEREWOLF_SCORE_MIN,
      werewolfMax: DEDUCIBILITY_THRESHOLDS.WEREWOLF_SCORE_MAX,
      redHerringMin: DEDUCIBILITY_THRESHOLDS.RED_HERRING_SCORE_MIN,
      redHerringMax: DEDUCIBILITY_THRESHOLDS.RED_HERRING_SCORE_MAX,
      gapMin: DEDUCIBILITY_THRESHOLDS.GAP_MIN,
      gapMax: DEDUCIBILITY_THRESHOLDS.GAP_MAX,
    },
    weightDefaults: EVIDENCE_WEIGHT_DEFAULTS,
  });

  const result = await generateStructured({
    prompt,
    schema: evidenceOutputSchema(timelineIds),
    temperature: TEMPERATURE.GENERATOR,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxAttempts: opts.maxAttempts ?? 3,
    ...(opts.model ? { model: opts.model } : {}),
    traceLabel: 'gen/evidence',
  });

  opts.collect?.({
    stage: 'evidence',
    durationMs: result.durationMs,
    ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
    ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
    geminiAttempts: result.geminiAttempts,
    schemaAttempts: result.schemaAttempts,
  });

  // id をコード側で採番して full Evidence へ組み立て
  const evidence: Evidence[] = result.data.evidence.map((e, i) => ({
    ...e,
    id: `ev_${i + 1}`,
  }));

  // 共有スキーマで防御的に再検証 (lean schema と full schema の差分を吸収)
  return z.array(schemas.evidenceSchema).parse(evidence);
}

/** LLM に出させる lean な単一証拠 (id は code 側で採番するため除外)。 */
const leanEvidenceShape = schemas.evidenceSchema.omit({ id: true });

/**
 * LLM に出させる lean スキーマ。共有 evidenceSchema から id を除いたものを配列で包む。
 * sourceTimelineEvent が渡された timeline の ID 集合に含まれることを superRefine で強制し、
 * LLM が存在しない ID を出した場合に generateStructured が再試行できるようにする。
 */
function evidenceOutputSchema(timelineIds: ReadonlySet<string>) {
  const leanEvidenceSchema = leanEvidenceShape.superRefine((data, ctx) => {
    if (!timelineIds.has(data.sourceTimelineEvent)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sourceTimelineEvent は実在する timeline event ID にしてください (allowed: ${[...timelineIds].join(', ')})`,
        path: ['sourceTimelineEvent'],
      });
    }
  });

  return z.object({ evidence: z.array(leanEvidenceSchema) });
}
