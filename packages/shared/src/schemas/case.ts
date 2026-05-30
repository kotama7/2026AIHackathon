import { z } from 'zod';

import { characterSchema } from './character.js';
import { deductionPathSchema } from './deduction.js';
import { evidenceSchema } from './evidence.js';
import { idSchema, timeStringSchema } from './primitives.js';
import { testimonySchema } from './testimony.js';
import { locationGraphSchema, timelineEventSchema } from './timeline.js';

export const validationIssueSchema = z.object({
  category: z.enum(['deducibility', 'logic', 'motivation', 'schema']),
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  relatedIds: z.array(z.string()).optional(),
});

export const validationResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(validationIssueSchema),
  scores: z.record(idSchema, z.number()).optional(),
  durationMs: z.number().optional(),
});

export const caseSkeletonSchema = z.object({
  werewolfId: idSchema,
  victimId: idSchema,
  attackTime: timeStringSchema,
  attackLocation: idSchema,
  attackRoute: z.string(),
  primaryEvidenceTypes: z.array(z.string()),
  redHerringCharacterId: idSchema,
  redHerringReason: z.string(),
  solutionLogic: z.string(),
  locationGraph: locationGraphSchema,
});

export const plannedLieSchema = z.object({
  liarId: idSchema,
  content: z.string(),
  reason: z.string().min(1, '嘘の理由は必須 (要件 §6.3)'),
  hiddenTruth: z.string().min(1),
  contradictedBy: z.array(z.string()).min(1, '嘘を崩す証拠/証言が必要 (要件 §6.3)'),
  reactionWhenExposed: z.string(),
});

export const caseTruthSchema = z
  .object({
    caseId: idSchema,
    summary: z.object({
      victimId: idSchema,
      werewolfId: idSchema,
      attackTime: timeStringSchema,
      attackLocation: idSchema,
      solutionLogic: z.string(),
    }),
    characters: z.array(characterSchema).length(6, 'MVP は 6 人村固定'),
    timeline: z.array(timelineEventSchema),
    evidence: z.array(evidenceSchema),
    testimonies: z.array(testimonySchema),
    plannedLies: z.array(plannedLieSchema),
    redHerrings: z.array(
      z.object({
        characterId: idSchema,
        reason: z.string().min(1),
      })
    ),
    deductionPath: deductionPathSchema,
    locationGraph: locationGraphSchema,
    validationResult: validationResultSchema,
  })
  .superRefine((data, ctx) => {
    // 人狼は 1 人 (MVP)
    const werewolves = data.characters.filter((c) => c.isWerewolf);
    if (werewolves.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `人狼は 1 人である必要があります (検出: ${werewolves.length} 人)`,
        path: ['characters'],
      });
    }
    if (werewolves[0]?.id !== data.summary.werewolfId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'summary.werewolfId と characters[isWerewolf=true].id が一致しません',
        path: ['summary', 'werewolfId'],
      });
    }
    // 証拠の sourceTimelineEvent が timeline に存在
    const timelineIds = new Set(data.timeline.map((e) => e.id));
    data.evidence.forEach((ev, i) => {
      if (!timelineIds.has(ev.sourceTimelineEvent)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `evidence[${i}].sourceTimelineEvent (${ev.sourceTimelineEvent}) は timeline に存在しません`,
          path: ['evidence', i, 'sourceTimelineEvent'],
        });
      }
    });
    // deductionPath.finalTarget は werewolf であること
    if (data.deductionPath.finalTarget !== data.summary.werewolfId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deductionPath.finalTarget は人狼でなければなりません',
        path: ['deductionPath', 'finalTarget'],
      });
    }
  });
