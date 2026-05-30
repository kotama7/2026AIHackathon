import { z } from 'zod';

import { idSchema } from './primitives.js';

export const deductionStepSchema = z.object({
  step: z.number().int().min(1),
  reasoning: z.string().min(1),
  requiredEvidence: z.array(idSchema),
  requiredTestimonies: z.array(idSchema),
  excludedSuspects: z.array(idSchema),
});

export const deductionPathSchema = z
  .object({
    steps: z.array(deductionStepSchema).min(1, 'deduction_path は最低 1 step 必要'),
    finalTarget: idSchema,
  })
  .superRefine((data, ctx) => {
    // step 番号が 1 から連番であること
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      if (step && step.step !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `step 番号は 1 から連番である必要があります (index ${i} は ${step.step})`,
          path: ['steps', i, 'step'],
        });
      }
    }
  });
