/**
 * A2-03: generateTimeline。
 * 事件夜 (23:00-01:00) の各キャラクターの行動を時系列で生成する (要件 §12.3)。
 *
 * caseSkeleton.ts と同じ Generator 構造に従う:
 *   1. buildTimelinePrompt() でプロンプトを組む
 *   2. generateStructured() で lean な LLM 出力スキーマ (id / causesEvidence なし) を満たすまで再試行
 *   3. コードで機械的フィールドを注入: id = `time_{i+1}`、causesEvidence = []
 *   4. 共有スキーマ (timelineEventSchema) で防御的に再検証
 *   5. opts.collect でメトリクスを通知し、データを返す
 *
 * 注意:
 * - causesEvidence は常に [] を返す。証拠生成後に stitch.wireEvidenceToTimeline が埋める。
 */
import type { CaseSkeleton, Character, TimelineEvent } from '@village/shared';
import { schemas } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import { buildTimelinePrompt } from '../../llm/prompts/generator/timeline.js';
import { generateStructured } from '../../llm/validateAndRetry.js';
import { type GeneratorOptions, VICTIM_ID } from '../types.js';

const MAX_OUTPUT_TOKENS = 8192;

/**
 * LLM に出させる lean スキーマ。
 * id / causesEvidence は含めず (コードで付与)、events 配列でラップする。
 */
const timelineOutputSchema = z.object({
  events: z.array(
    z.object({
      time: schemas.timeStringSchema,
      character: schemas.idSchema,
      location: schemas.idSchema,
      action: z.string().min(1),
      knownBy: z.array(schemas.idSchema),
      observedBy: z.array(schemas.idSchema),
    })
  ),
});

export async function generateTimeline(
  skeleton: CaseSkeleton,
  characters: Character[],
  opts: GeneratorOptions = {}
): Promise<TimelineEvent[]> {
  const prompt = buildTimelinePrompt({
    skeleton,
    characters,
    victimId: VICTIM_ID,
  });

  const result = await generateStructured({
    prompt,
    schema: timelineOutputSchema,
    temperature: TEMPERATURE.GENERATOR,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxAttempts: opts.maxAttempts ?? 3,
    ...(opts.model ? { model: opts.model } : {}),
    traceLabel: 'gen/timeline',
  });

  opts.collect?.({
    stage: 'timeline',
    durationMs: result.durationMs,
    ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
    ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
    geminiAttempts: result.geminiAttempts,
    schemaAttempts: result.schemaAttempts,
  });

  // コードで機械的フィールドを注入: id を time_{i+1} で採番、causesEvidence は空配列。
  const events: TimelineEvent[] = result.data.events.map((e, i) => ({
    id: `time_${i + 1}`,
    time: e.time,
    character: e.character,
    location: e.location,
    action: e.action,
    knownBy: e.knownBy,
    observedBy: e.observedBy,
    causesEvidence: [],
  }));

  // 共有スキーマで防御的に再検証 (lean schema と full schema の差分を吸収)。
  return z.array(schemas.timelineEventSchema).parse(events);
}
