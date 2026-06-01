/**
 * A2-05: generateTestimonies。
 * 要件 §6.5 の証言群を生成する。
 *
 * 設計上の固定ルール:
 * - id はコードが t1, t2... と順番に採番する (LLM には付けさせない)。
 * - 各証言の knownFactsUsed は、その話者の知識範囲 (knownFacts) の部分集合に強制する。
 *   LLM がはみ出した id を返しても、コードで交差を取り落とす (安全網)。
 * - 嘘 (lie) には lieReason と非空の contradictedBy が必須 (共有スキーマが保証)。
 * - 容疑者 1 人あたり最低 2 件、合計 12 件以上 (件数はスキーマで縛れないのでコードで検証)。
 *
 * caseSkeleton.ts (A2-01) と同じ構造に従う。
 */
import type { CaseSkeleton, Character, Evidence, Testimony, TimelineEvent } from '@village/shared';
import { schemas } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import { buildTestimoniesPrompt } from '../../llm/prompts/generator/testimonies.js';
import { generateStructured } from '../../llm/validateAndRetry.js';
import { knowledgeRange } from '../stitch.js';
import type { GeneratorOptions } from '../types.js';

const MAX_OUTPUT_TOKENS = 8192;
const MIN_TESTIMONIES_PER_SUSPECT = 2;

/**
 * LLM に出させる lean な 1 証言スキーマ。
 * id は持たない (コードが t{i+1} を注入する)。
 * lie / contradictedBy の整合性は full な testimonySchema 再検証側で担保する。
 */
const leanTestimonySchema = z.object({
  day: z.number().int().min(1).max(3),
  speakerId: schemas.idSchema,
  text: z.string().min(1),
  truthStatus: schemas.truthStatusSchema,
  // LLM は正直な証言で lieReason に null を返すため nullish (null|undefined 許容)。
  // optional だけだと null を拒否し検証失敗→無駄な再生成を招く。
  lieReason: z.string().nullish(),
  contradictedBy: z.array(schemas.idSchema),
  knownFactsUsed: z.array(z.string()),
});

const testimoniesOutputSchema = z.object({
  testimonies: z.array(leanTestimonySchema),
});

export async function generateTestimonies(
  skeleton: CaseSkeleton,
  characters: Character[],
  timeline: TimelineEvent[],
  evidence: Evidence[],
  opts: GeneratorOptions = {}
): Promise<Testimony[]> {
  const prompt = buildTestimoniesPrompt({ skeleton, characters, timeline, evidence });

  const result = await generateStructured({
    prompt,
    schema: testimoniesOutputSchema,
    temperature: TEMPERATURE.GENERATOR,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxAttempts: opts.maxAttempts ?? 3,
    ...(opts.model ? { model: opts.model } : {}),
    traceLabel: 'gen/testimonies',
  });

  opts.collect?.({
    stage: 'testimonies',
    durationMs: result.durationMs,
    ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
    ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
    geminiAttempts: result.geminiAttempts,
    schemaAttempts: result.schemaAttempts,
  });

  // 話者ごとの知識範囲を組み立てる。character.knownFacts を優先しつつ、
  // 欠落時は timeline から再計算する (安全網)。
  const knownByCharacter = new Map<string, Set<string>>();
  for (const c of characters) {
    const fromCharacter = c.knownFacts ?? [];
    const range =
      fromCharacter.length > 0 ? new Set(fromCharacter) : knowledgeRange(c.id, timeline);
    knownByCharacter.set(c.id, range);
  }

  // id を採番し、knownFactsUsed を話者の知識範囲で交差させる。
  const testimonies: Testimony[] = result.data.testimonies.map((t, i) => {
    const range = knownByCharacter.get(t.speakerId) ?? new Set<string>();
    const knownFactsUsed = t.knownFactsUsed.filter((id) => range.has(id));
    return {
      id: `t${i + 1}`,
      day: t.day,
      speakerId: t.speakerId,
      text: t.text,
      truthStatus: t.truthStatus,
      ...(t.lieReason != null ? { lieReason: t.lieReason } : {}),
      contradictedBy: t.contradictedBy,
      knownFactsUsed,
    };
  });

  // 共有スキーマで防御的に再検証 (lie ⇒ lieReason + 非空 contradictedBy を保証)。
  const validated = z.array(schemas.testimonySchema).parse(testimonies);

  // 件数はスキーマで縛れないのでコードで検証する。
  assertTestimonyCounts(validated, characters);

  return validated;
}

/**
 * 容疑者ごとに最低 2 件、合計 12 件以上であることを検証する。
 * 満たさなければ明確なエラーを投げる。
 */
function assertTestimonyCounts(testimonies: Testimony[], characters: Character[]): void {
  const minTotal = characters.length * MIN_TESTIMONIES_PER_SUSPECT;
  if (testimonies.length < minTotal) {
    throw new Error(`testimonies が不足: ${testimonies.length} 件 (最低 ${minTotal} 件必要)`);
  }

  const countBySpeaker = new Map<string, number>();
  for (const t of testimonies) {
    countBySpeaker.set(t.speakerId, (countBySpeaker.get(t.speakerId) ?? 0) + 1);
  }
  const lacking = characters
    .filter((c) => (countBySpeaker.get(c.id) ?? 0) < MIN_TESTIMONIES_PER_SUSPECT)
    .map((c) => `${c.id}=${countBySpeaker.get(c.id) ?? 0}`);
  if (lacking.length > 0) {
    throw new Error(
      `各容疑者から最低 ${MIN_TESTIMONIES_PER_SUSPECT} 件の証言が必要ですが不足: ${lacking.join(', ')}`
    );
  }
}
