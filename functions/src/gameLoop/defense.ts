import type { Character, DialogueOutput, Evidence, Testimony } from '@village/shared';
import { dialogueOutputSchema } from '@village/shared';
import { logger } from 'firebase-functions/v2';

import { TEMPERATURE } from '../llm/geminiClient.js';
import { buildDefensePrompt } from '../llm/prompts/speaker/defense.js';
import { generateStructured } from '../llm/validateAndRetry.js';
import { buildScopeRetryHint, enforceKnowledgeScope } from './knowledgeScope.js';

export type GenerateDefenseArgs = {
  suspect: Character;
  presentedEvidence: Evidence[];
  presentedContradictions: Testimony[];
};

export type GenerateDefenseResult = {
  output: DialogueOutput;
  /** UI 表示用: utterance をそのまま defenseText として使う */
  defenseText: string;
};

/**
 * A4-01: 容疑者の弁明テキストを LLM で生成。
 *
 * - 人狼: temperature 0.7（柔軟に切り抜ける）
 * - 村人: temperature 0.5（安定して誠実に）
 * - 知識範囲ガード違反時は 1 回だけリトライ
 */
export async function generateDefense(args: GenerateDefenseArgs): Promise<GenerateDefenseResult> {
  const temperature = args.suspect.isWerewolf ? TEMPERATURE.SPEAKER : 0.5;
  const basePrompt = buildDefensePrompt(args);

  let result = await generateStructured({
    schema: dialogueOutputSchema,
    prompt: basePrompt,
    temperature,
    maxAttempts: 2,
    maxOutputTokens: 800,
    traceLabel: `defense/${args.suspect.id}`,
  });
  const violations = enforceKnowledgeScope(result.data, args.suspect);

  if (violations.length > 0) {
    logger.warn('[defense] knowledge scope violation, retrying once', {
      suspectId: args.suspect.id,
      violations,
    });
    const retryPrompt = basePrompt + buildScopeRetryHint(violations);
    result = await generateStructured({
      schema: dialogueOutputSchema,
      prompt: retryPrompt,
      temperature,
      maxAttempts: 2,
      maxOutputTokens: 800,
      traceLabel: `defense/${args.suspect.id}/retry`,
    });
  }

  return { output: result.data, defenseText: result.data.utterance };
}
