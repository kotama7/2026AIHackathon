import type { Character, DialogueOutput, Evidence, QuestionType, Testimony } from '@village/shared';
import { dialogueOutputSchema } from '@village/shared';
import { logger } from 'firebase-functions/v2';

import { TEMPERATURE } from '../llm/geminiClient.js';
import { buildInterrogationPrompt } from '../llm/prompts/speaker/interrogation.js';
import { generateStructured } from '../llm/validateAndRetry.js';
import {
  buildScopeRetryHint,
  enforceKnowledgeScope,
  type KnowledgeScopeViolation,
} from './knowledgeScope.js';

export type GenerateInterrogationAnswerArgs = {
  target: Character;
  questionType: QuestionType;
  questionText: string;
  presentedEvidence?: Evidence;
  presentedContradictions?: Testimony[];
  pastUtterances: string[];
};

export type GenerateInterrogationAnswerResult = {
  output: DialogueOutput;
  scopeViolations: KnowledgeScopeViolation[];
};

/**
 * A3-02: 5 質問タイプ別の尋問回答を生成する。
 *
 * - generateStructured で JSON 出力 + zod 検証
 * - knowledgeScope を後段で検証。違反時は 1 回だけ追加ヒントを添えて再生成
 */
export async function generateInterrogationAnswer(
  args: GenerateInterrogationAnswerArgs
): Promise<GenerateInterrogationAnswerResult> {
  const basePrompt = buildInterrogationPrompt(args);

  // 1 回目
  let result = await generateStructured({
    schema: dialogueOutputSchema,
    prompt: basePrompt,
    temperature: TEMPERATURE.SPEAKER,
    maxAttempts: 2,
    traceLabel: `interrogation/${args.target.id}/${args.questionType}`,
  });
  let violations = enforceKnowledgeScope(result.data, args.target);

  // 1 回だけリトライ (A3-03: 最大 2 回)
  if (violations.length > 0) {
    logger.warn('[interrogation] knowledge scope violation, retrying once', {
      targetId: args.target.id,
      violations,
    });
    const retryPrompt = basePrompt + buildScopeRetryHint(violations);
    result = await generateStructured({
      schema: dialogueOutputSchema,
      prompt: retryPrompt,
      temperature: TEMPERATURE.SPEAKER,
      maxAttempts: 2,
      traceLabel: `interrogation/${args.target.id}/${args.questionType}/retry`,
    });
    violations = enforceKnowledgeScope(result.data, args.target);
  }

  return { output: result.data, scopeViolations: violations };
}
