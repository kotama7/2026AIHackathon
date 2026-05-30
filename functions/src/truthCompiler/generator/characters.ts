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

  // 機械的フィールドをコードで注入し full Character[] を組み立てる
  const characters: Character[] = result.data.characters.map((lean, i) => {
    const id = ids[i]!;
    const isWerewolf = id === skeleton.werewolfId;
    return {
      ...lean,
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
 * LLM に出させる lean スキーマ。共有 characterSchema から「創作フィールド」のみを抜き出す。
 * id / isWerewolf / role / knownFacts / isAlive / trustToPlayer / suspicions /
 * accentColor はコード側で注入するため省く。
 */
const leanCharacterSchema = schemas.characterSchema.pick({
  name: true,
  publicPersonality: true,
  speakingStyle: true,
  socialRole: true,
  secret: true,
  privateGoal: true,
  fear: true,
  bias: true,
  emotionalState: true,
  lieTendency: true,
  cooperationLevel: true,
  liePolicy: true,
  cooperationPolicy: true,
  relationships: true,
});

const charactersOutputSchema = z.object({
  characters: z.array(leanCharacterSchema).length(CHARACTER_COUNT),
});
