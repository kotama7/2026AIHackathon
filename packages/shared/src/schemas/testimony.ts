import { z } from 'zod';

import { idSchema } from './primitives.js';

export const truthStatusSchema = z.enum([
  'truth',
  'lie',
  'misunderstanding',
  'omission',
  'uncertainty',
]);

export const testimonySchema = z
  .object({
    id: idSchema,
    day: z.number().int().min(1).max(3),
    speakerId: idSchema,
    text: z.string().min(1),
    truthStatus: truthStatusSchema,
    lieReason: z.string().optional(),
    contradictedBy: z.array(idSchema),
    knownFactsUsed: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    // 要件 §6.3: すべての嘘には理由が必須
    if (data.truthStatus === 'lie' && !data.lieReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'truthStatus === "lie" の場合 lieReason は必須 (要件 §6.3)',
        path: ['lieReason'],
      });
    }
    if (data.truthStatus === 'lie' && data.contradictedBy.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'すべての嘘は崩せる証拠/証言が必要 (要件 §6.3)',
        path: ['contradictedBy'],
      });
    }
  });
