import { z } from 'zod';

import { idSchema } from './primitives.js';

export const roleSchema = z.enum(['villager', 'werewolf']);

export const emotionalStateSchema = z.enum([
  'calm',
  'tense',
  'angry',
  'fearful',
  'guilty',
  'confident',
]);

export const liePolicySchema = z.object({
  willLieAbout: z.array(z.string()),
  willNotLieAbout: z.array(z.string()),
});

export const cooperationPolicySchema = z.object({
  cooperateWith: z.array(idSchema),
  conditions: z.string(),
});

export const relationshipSchema = z.object({
  withCharacter: idSchema,
  label: z.string(),
  affinity: z.number().min(-100).max(100),
});

export const characterPublicSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(20),
  publicPersonality: z.string(),
  speakingStyle: z.string(),
  socialRole: z.string(),
  accentColor: z.string().optional(),
  isAlive: z.boolean(),
  trustToPlayer: z.number().min(0).max(100),
});

export const characterSchema = characterPublicSchema.extend({
  role: roleSchema,
  isWerewolf: z.boolean(),
  secret: z.string().min(1, 'すべての村人に秘密が必須 (要件 §6.2)'),
  privateGoal: z.string().min(1, 'すべての村人に private_goal が必須 (要件 §7.3)'),
  fear: z.string().min(1, 'すべての村人に fear が必須 (要件 §7.3)'),
  bias: z.string(),
  knownFacts: z.array(z.string()),
  suspicions: z.record(idSchema, z.number().min(0).max(100)),
  emotionalState: emotionalStateSchema,
  lieTendency: z.number().min(0).max(100),
  cooperationLevel: z.number().min(0).max(100),
  liePolicy: liePolicySchema,
  cooperationPolicy: cooperationPolicySchema,
  relationships: z.array(relationshipSchema),
});
