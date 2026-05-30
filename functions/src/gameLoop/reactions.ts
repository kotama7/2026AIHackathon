import type { Character, TrialDecision } from '@village/shared';
import { dialogueOutputSchema } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import { TEMPERATURE } from '../llm/geminiClient.js';
import { buildReactionPrompt } from '../llm/prompts/speaker/reaction.js';
import { generateStructured } from '../llm/validateAndRetry.js';
import { enforceKnowledgeScope } from './knowledgeScope.js';

const reactionStanceSchema = z.enum(['support', 'oppose', 'neutral']);

/**
 * 反応用スキーマ。dialogueOutputSchema を extends して stance を追加する。
 * 共有 schema に手を入れず、Functions 側でだけ拡張型として使う。
 */
const reactionOutputSchema = dialogueOutputSchema.extend({
  stance: reactionStanceSchema,
});

export type GenerateReactionsArgs = {
  suspect: Character;
  /** 反応するキャラ群 (生存 + suspect 除外を呼び出し側で実施) */
  reactors: Character[];
  defenseText: string;
};

export type GenerateReactionsResult = {
  reactions: TrialDecision['reactions'];
};

/**
 * A4-02: 弁明への他キャラ反応を並列で生成し、{characterId, text, stance}[] にまとめる。
 *
 * - 反応失敗したキャラはスキップ (全員必須ではない)
 * - 知識範囲違反はログのみで採用 (1〜2 文の短い反応なので誤情報リスクは低い)
 */
export async function generateReactions(
  args: GenerateReactionsArgs
): Promise<GenerateReactionsResult> {
  const { suspect, reactors, defenseText } = args;

  const settled = await Promise.allSettled(
    reactors.map(async (reactor) => {
      const prompt = buildReactionPrompt({ reactor, suspect, defenseText });
      const { data } = await generateStructured({
        schema: reactionOutputSchema,
        prompt,
        temperature: TEMPERATURE.SPEAKER,
        maxAttempts: 2,
        maxOutputTokens: 300,
        traceLabel: `reaction/${reactor.id}`,
      });
      // 知識範囲ガードはログのみ
      const violations = enforceKnowledgeScope(data, reactor);
      if (violations.length > 0) {
        logger.warn('[reactions] knowledge scope violation', { reactorId: reactor.id, violations });
      }
      return {
        characterId: reactor.id,
        text: data.utterance,
        stance: data.stance,
      };
    })
  );

  const reactions: TrialDecision['reactions'] = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]!;
    if (r.status === 'fulfilled') {
      reactions.push(r.value);
    } else {
      logger.warn('[reactions] generation failed for one reactor', {
        reactorId: reactors[i]?.id,
        reason: String(r.reason),
      });
    }
  }

  return { reactions };
}
