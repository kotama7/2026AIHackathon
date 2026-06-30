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
import { logger } from 'firebase-functions/v2';
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
 *
 * ローカルLLM (qwen3:8b 等) は truthStatus に enum 外の値 ('true' 等)、day や
 * contradictedBy の欠落、testimonies を配列でなく object で返す等のドリフトを起こすため、
 * ここでは **寛容に受けて決定論的に正規化** する。
 */
type TruthStatus = 'truth' | 'lie' | 'misunderstanding' | 'omission' | 'uncertainty';
const ALLOWED_TRUTH_STATUS: readonly TruthStatus[] = [
  'truth',
  'lie',
  'misunderstanding',
  'omission',
  'uncertainty',
];
const TRUTH_STATUS_SYNONYMS: Record<string, TruthStatus> = {
  true: 'truth',
  truthful: 'truth',
  honest: 'truth',
  accurate: 'truth',
  factual: 'truth',
  correct: 'truth',
  false: 'lie',
  lying: 'lie',
  deception: 'lie',
  deceptive: 'lie',
  dishonest: 'lie',
  fabrication: 'lie',
  fabricated: 'lie',
  misunderstood: 'misunderstanding',
  mistake: 'misunderstanding',
  mistaken: 'misunderstanding',
  confusion: 'misunderstanding',
  omitted: 'omission',
  omit: 'omission',
  withheld: 'omission',
  hiding: 'omission',
  partial: 'omission',
  unsure: 'uncertainty',
  uncertain: 'uncertainty',
  unknown: 'uncertainty',
  unclear: 'uncertainty',
  vague: 'uncertainty',
};

function coerceTruthStatus(v: unknown): TruthStatus {
  if (typeof v === 'string') {
    const k = v.trim().toLowerCase();
    if (ALLOWED_TRUTH_STATUS.includes(k as TruthStatus)) return k as TruthStatus;
    if (TRUTH_STATUS_SYNONYMS[k]) return TRUTH_STATUS_SYNONYMS[k]!;
  }
  return 'truth';
}

function clampDay(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.min(3, Math.round(x)));
}

const tolerantStringArray = z.array(z.coerce.string()).catch([]).default([]);

const leanTestimonySchema = z.object({
  day: z.unknown().transform(clampDay),
  speakerId: z.coerce.string(),
  text: z.string().min(1),
  truthStatus: z.unknown().transform(coerceTruthStatus),
  // LLM は正直な証言で lieReason に null を返すため nullish (null|undefined 許容)。
  lieReason: z.coerce.string().nullish().catch(null),
  contradictedBy: tolerantStringArray,
  knownFactsUsed: tolerantStringArray,
});

const testimoniesOutputSchema = z.object({
  // qwen3 等は配列でなく {"0":{...},"1":{...}} のような object を返すことがある → 値配列に正規化
  testimonies: z.preprocess(
    (v) =>
      Array.isArray(v)
        ? v
        : v && typeof v === 'object'
          ? Object.values(v as Record<string, unknown>)
          : v,
    z.array(leanTestimonySchema)
  ),
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

  // speakerId を char_id へ正規化する。ローカルLLM は speakerId に名前や "char1" 等を
  // 入れがちで、そのままだと件数照合 (assertTestimonyCounts) が全員 0 件になり再生成ループに陥る。
  const idSet = new Set(characters.map((c) => c.id));
  const nameToId = new Map<string, string>();
  for (const c of characters) {
    const nm = c.name.trim().toLowerCase();
    if (nm) nameToId.set(nm, c.id);
  }
  const normalizeSpeakerId = (raw: string): string | null => {
    const s = (raw ?? '').trim();
    if (!s) return null;
    if (idSet.has(s)) return s;
    // "char1" / "char-1" / "Char 1" → char_1
    const m = s.toLowerCase().match(/char[_\- ]?(\d+)/);
    if (m) {
      const cand = `char_${m[1]}`;
      if (idSet.has(cand)) return cand;
    }
    // 名前 (完全一致 → 部分一致)
    const lower = s.toLowerCase();
    const exact = nameToId.get(lower);
    if (exact) return exact;
    for (const c of characters) {
      const nm = c.name.trim().toLowerCase();
      if (nm && (lower.includes(nm) || nm.includes(lower))) return c.id;
    }
    return null;
  };

  // id を採番し、knownFactsUsed を話者の知識範囲で交差させる。
  // speakerId を解決できない証言は捨てる (話者に紐づけられないため)。
  const testimonies: Testimony[] = result.data.testimonies
    .map((t) => ({ t, speakerId: normalizeSpeakerId(t.speakerId) }))
    .filter((x): x is { t: (typeof result.data.testimonies)[number]; speakerId: string } => {
      return x.speakerId !== null;
    })
    .map(({ t, speakerId }, i) => {
      const range = knownByCharacter.get(speakerId) ?? new Set<string>();
      const knownFactsUsed = t.knownFactsUsed.filter((id) => range.has(id));

      // 嘘の不変条件 (要件 §6.3) をコードで担保する。
      // ローカルLLM は「嘘」と言いつつ lieReason / contradictedBy を欠くことがあるため、
      // 条件を満たせない嘘は 'uncertainty' に降格させて最終スキーマ検証を通す。
      let truthStatus = t.truthStatus;
      let lieReason = t.lieReason ?? undefined;
      const contradictedBy = t.contradictedBy;
      if (truthStatus === 'lie' && (contradictedBy.length === 0 || !lieReason)) {
        truthStatus = 'uncertainty';
        lieReason = undefined;
      }

      return {
        id: `t${i + 1}`,
        day: t.day,
        speakerId,
        text: t.text,
        truthStatus,
        ...(lieReason != null ? { lieReason } : {}),
        contradictedBy,
        knownFactsUsed,
      };
    });

  // 共有スキーマで防御的に再検証 (lie ⇒ lieReason + 非空 contradictedBy を保証)。
  const validated = z.array(schemas.testimonySchema).parse(testimonies);

  // 件数不足は throw せず filler で補完する (件数はスキーマで縛れない)。
  return padTestimonyCounts(validated, characters);
}

/**
 * 容疑者ごとに最低 MIN_TESTIMONIES_PER_SUSPECT 件を満たすよう、不足分を中立的な
 * filler 証言 (truthStatus='uncertainty') で補完する。
 *
 * 以前はここで throw してサイクルを丸ごと破棄→regen していたが、LLM が特定キャラの
 * 証言を取りこぼすたびに高コストな全再生成を強制し、関数タイムアウト (deadline-exceeded)
 * の主因になっていた。人狼特定の可解性は証拠スコア (deducibility) と deduction_path 側が
 * 担保するため、件数充足は安全に padding で吸収する。
 */
function padTestimonyCounts(testimonies: Testimony[], characters: Character[]): Testimony[] {
  const result = [...testimonies];
  const countBySpeaker = new Map<string, number>();
  for (const t of testimonies) {
    countBySpeaker.set(t.speakerId, (countBySpeaker.get(t.speakerId) ?? 0) + 1);
  }

  let seq = testimonies.length;
  const lacking: string[] = [];
  for (const c of characters) {
    let count = countBySpeaker.get(c.id) ?? 0;
    if (count < MIN_TESTIMONIES_PER_SUSPECT) lacking.push(`${c.id}=${count}`);
    while (count < MIN_TESTIMONIES_PER_SUSPECT) {
      seq += 1;
      result.push({
        id: `t${seq}`,
        day: 1,
        speakerId: c.id,
        text: 'この件について、今はっきり話せることは特にない。',
        truthStatus: 'uncertainty',
        contradictedBy: [],
        knownFactsUsed: [],
      });
      count += 1;
    }
  }

  if (lacking.length > 0) {
    logger.warn('[gen/testimonies] 件数不足を filler で補完', {
      lacking,
      padded: result.length - testimonies.length,
    });
  }
  return result;
}
