/**
 * A2-02: generateCharacters。
 * 事件骨格 (CaseSkeleton) と整合する全 6 人分のキャラクター思惑 (要件 §6.2) を生成する。
 *
 * caseSkeleton.ts と同じリファレンス構造に従う:
 *   1. buildCharactersPrompt() でプロンプトを組む
 *   2. generateStructured() で lean な LLM 出力スキーマ (創作フィールドのみ) を満たすまで再試行
 *   3. コードで機械的フィールド (id / isWerewolf / role / 既定値) を注入し full 型へ組み立て
 *   4. 共有 characterSchema で防御的に再検証 + 人狼ちょうど 1 人を表明
 *   5. opts.collect でメトリクスを通知し、データを返す
 *
 * 固定ルール:
 * - id は char_{i+1} (出力配列の順序で付与)
 * - isWerewolf = (id === skeleton.werewolfId)、role = isWerewolf ? 'werewolf' : 'villager'
 * - knownFacts は必ず [] (タイムラインからの stitching は後段で行う)
 * - suspicions = {} / isAlive = true / trustToPlayer = 50 を既定で注入
 */
import type { CaseSkeleton, Character } from '@village/shared';
import { schemas } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import { buildCharactersPrompt } from '../../llm/prompts/generator/characters.js';
import { generateStructured } from '../../llm/validateAndRetry.js';
import { characterIds, type GeneratorOptions } from '../types.js';

const MAX_OUTPUT_TOKENS = 8192;
const CHARACTER_COUNT = 6;

export async function generateCharacters(
  skeleton: CaseSkeleton,
  opts: GeneratorOptions = {}
): Promise<Character[]> {
  const ids = characterIds(CHARACTER_COUNT);

  const prompt = buildCharactersPrompt({
    characterIds: ids,
    victimId: skeleton.victimId,
    werewolfId: skeleton.werewolfId,
    redHerringCharacterId: skeleton.redHerringCharacterId,
    redHerringReason: skeleton.redHerringReason,
  });

  const result = await generateStructured({
    prompt,
    schema: charactersOutputSchema,
    temperature: TEMPERATURE.GENERATOR,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxAttempts: opts.maxAttempts ?? 3,
    ...(opts.model ? { model: opts.model } : {}),
    traceLabel: 'gen/characters',
  });

  opts.collect?.({
    stage: 'characters',
    durationMs: result.durationMs,
    ...(result.inputTokens !== undefined ? { inputTokens: result.inputTokens } : {}),
    ...(result.outputTokens !== undefined ? { outputTokens: result.outputTokens } : {}),
    geminiAttempts: result.geminiAttempts,
    schemaAttempts: result.schemaAttempts,
  });

  // 参照可能な ID 集合 (容疑者 + 被害者)。LLM が範囲外/自己参照の関係を作りがちなので健全化する。
  const idSet = new Set(ids);
  const validRefTargets = new Set([...ids, skeleton.victimId]);

  // 機械的フィールドをコードで注入し full Character[] を組み立てる
  const characters: Character[] = result.data.characters.map((lean, i) => {
    const id = ids[i]!;
    const isWerewolf = id === skeleton.werewolfId;
    // ローカルLLMは範囲外/自己参照の char_id を出しがち → 有効な参照だけ残す
    const relationships = lean.relationships.filter(
      (r) => r.withCharacter !== id && validRefTargets.has(r.withCharacter)
    );
    const cooperateWith = lean.cooperationPolicy.cooperateWith.filter(
      (c) => c !== id && idSet.has(c)
    );
    return {
      ...lean,
      relationships,
      cooperationPolicy: { ...lean.cooperationPolicy, cooperateWith },
      id,
      isWerewolf,
      role: isWerewolf ? 'werewolf' : 'villager',
      knownFacts: [],
      suspicions: {},
      isAlive: true,
      trustToPlayer: 50,
    };
  });

  // 共有スキーマで防御的に再検証 (lean schema と full schema の差分を吸収)
  const validated = z.array(schemas.characterSchema).length(CHARACTER_COUNT).parse(characters);

  // 人狼はちょうど 1 人であることを表明
  const werewolves = validated.filter((c) => c.isWerewolf);
  if (werewolves.length !== 1) {
    throw new Error(`人狼はちょうど 1 人でなければなりません (検出: ${werewolves.length} 人)`);
  }

  return validated;
}

/**
 * LLM に出させる lean スキーマ。共有 characterSchema の「創作フィールド」に対応するが、
 * ローカルLLM (qwen3:8b 等) が enum 同義語・必須配列の欠落・数値の型ずれを起こしがちなため、
 * ここでは **寛容に受けて決定論的に正規化** する。正規化後の値は generateCharacters() 側の
 * 厳格な `schemas.characterSchema` 再検証 (line 80) で最終保証される。
 * id / isWerewolf / role / knownFacts / isAlive / trustToPlayer / suspicions /
 * accentColor はコード側で注入するため省く。
 */
const ALLOWED_EMOTIONS = ['calm', 'tense', 'angry', 'fearful', 'guilty', 'confident'] as const;
type Emotion = (typeof ALLOWED_EMOTIONS)[number];

// enum 外の同義語を最も近い許容値へ寄せる (未知は 'calm')
const EMOTION_SYNONYMS: Record<string, Emotion> = {
  neutral: 'calm',
  relaxed: 'calm',
  curious: 'calm',
  composed: 'calm',
  nervous: 'tense',
  anxious: 'tense',
  worried: 'tense',
  uneasy: 'tense',
  stressed: 'tense',
  irritated: 'angry',
  hostile: 'angry',
  furious: 'angry',
  defensive: 'angry',
  afraid: 'fearful',
  scared: 'fearful',
  frightened: 'fearful',
  panicked: 'fearful',
  ashamed: 'guilty',
  remorseful: 'guilty',
  regretful: 'guilty',
  proud: 'confident',
  assertive: 'confident',
  happy: 'confident',
  cheerful: 'confident',
};

function coerceEmotion(v: unknown): Emotion {
  if (typeof v === 'string') {
    const k = v.trim().toLowerCase();
    if ((ALLOWED_EMOTIONS as readonly string[]).includes(k)) return k as Emotion;
    if (EMOTION_SYNONYMS[k]) return EMOTION_SYNONYMS[k]!;
  }
  return 'calm';
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  const x = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(x)) return dflt;
  return Math.max(lo, Math.min(hi, Math.round(x)));
}

const tolerantStringArray = z.array(z.coerce.string()).catch([]).default([]);

const leanCharacterSchema = z.object({
  name: z
    .string()
    .min(1)
    .transform((s) => s.trim().slice(0, 20)),
  publicPersonality: z.coerce.string().catch('').default(''),
  speakingStyle: z.coerce.string().catch('').default(''),
  socialRole: z.coerce.string().catch('').default(''),
  // 物語の核なので空は許さない (空なら再生成させる)
  secret: z.string().min(1),
  privateGoal: z.string().min(1),
  fear: z.string().min(1),
  bias: z.coerce.string().catch('').default(''),
  emotionalState: z.unknown().transform(coerceEmotion),
  lieTendency: z.unknown().transform((v) => clampInt(v, 0, 100, 50)),
  cooperationLevel: z.unknown().transform((v) => clampInt(v, 0, 100, 50)),
  liePolicy: z
    .object({
      willLieAbout: tolerantStringArray,
      willNotLieAbout: tolerantStringArray,
    })
    .catch({ willLieAbout: [], willNotLieAbout: [] })
    .default({ willLieAbout: [], willNotLieAbout: [] }),
  cooperationPolicy: z
    .object({
      cooperateWith: tolerantStringArray,
      conditions: z.coerce.string().catch('').default(''),
    })
    .catch({ cooperateWith: [], conditions: '' })
    .default({ cooperateWith: [], conditions: '' }),
  relationships: z
    .array(
      z
        .object({
          withCharacter: z.coerce.string(),
          label: z.coerce.string().catch('').default(''),
          affinity: z.unknown().transform((v) => clampInt(v, -100, 100, 0)),
        })
        // 形が壊れた要素は捨てる (後段で有効参照のみ残す)
        .catch({ withCharacter: '', label: '', affinity: 0 })
    )
    .catch([])
    .default([]),
});

const charactersOutputSchema = z.object({
  characters: z.array(leanCharacterSchema).length(CHARACTER_COUNT),
});
