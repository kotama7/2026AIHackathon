import { z } from 'zod';

import { idSchema, timeStringSchema } from './primitives.js';

export const timelineEventSchema = z.object({
  id: idSchema,
  time: timeStringSchema,
  character: idSchema,
  location: idSchema,
  action: z.string().min(1),
  knownBy: z.array(idSchema),
  observedBy: z.array(idSchema),
  causesEvidence: z.array(idSchema),
});

export const locationGraphSchema = z.object({
  locations: z.array(idSchema).min(2, '場所は最低 2 つ必要'),
  adjacency: z.record(idSchema, z.array(idSchema)),
  displayNames: z.record(idSchema, z.string()),
});
