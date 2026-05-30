import { z } from 'zod';

import { idSchema } from './primitives.js';

export const evidenceCategorySchema = z.enum(['confirmatory', 'supporting', 'noise']);
export const evidenceReliabilitySchema = z.enum(['A', 'B', 'C']);

export const evidencePublicSchema = z.object({
  id: idSchema,
  day: z.number().int().min(1).max(3),
  name: z.string().min(1),
  description: z.string().min(1),
  reliability: evidenceReliabilitySchema,
  relatedCharacters: z.array(idSchema),
});

export const evidenceSchema = evidencePublicSchema.extend({
  category: evidenceCategorySchema,
  pointsTo: z.array(idSchema).min(1),
  weight: z.number().int().min(0).max(5),
  ambiguity: z.number().int().min(0).max(3),
  trueInterpretation: z.string().min(1),
  sourceTimelineEvent: idSchema,
});
