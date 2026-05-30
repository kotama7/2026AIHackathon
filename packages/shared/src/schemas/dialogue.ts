import { z } from 'zod';

import { emotionalStateSchema } from './character.js';
import { firebaseTimestampSchema, idSchema } from './primitives.js';
import { truthStatusSchema } from './testimony.js';

export const dialogueIntentSchema = z.enum([
  'accuse',
  'defend',
  'suspicion',
  'observation',
  'question',
  'agree',
  'disagree',
  'evasive',
]);

export const dialoguePhaseSchema = z.enum([
  'morning',
  'discussion',
  'investigation',
  'trial',
  'night',
]);

export const dialogueLogSchema = z.object({
  id: idSchema,
  day: z.number().int().min(1).max(3),
  phase: dialoguePhaseSchema,
  turn: z.number().int().min(0),
  speakerId: idSchema,
  targetId: idSchema.optional(),
  text: z.string().min(1),
  intent: dialogueIntentSchema,
  confidence: z.number().min(0).max(1),
  emotion: emotionalStateSchema,
  createdAt: firebaseTimestampSchema,
});

/**
 * LLM が発言生成時に出力する JSON。要件 §13.4。
 * generateContent の構造化出力として直接受け取る。
 */
export const dialogueOutputSchema = z.object({
  utterance: z.string().min(1).max(500),
  intent: dialogueIntentSchema,
  target: idSchema.nullable().optional(),
  truthStatus: truthStatusSchema,
  confidence: z.number().min(0).max(1),
  emotion: emotionalStateSchema,
  /** この発言を生成するにあたって参照した knownFacts キー (知識範囲ガード用) */
  knownFactsUsed: z.array(z.string()),
});

export type DialogueOutput = z.infer<typeof dialogueOutputSchema>;
