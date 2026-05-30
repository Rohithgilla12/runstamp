import { z } from 'zod';

export const StampTierSchema = z.enum(['common', 'rare', 'mythic']);
export type StampTier = z.infer<typeof StampTierSchema>;

export const StampDefinitionRawSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tier: StampTierSchema,
  category: z.string(),
  criteria: z.unknown(),
  sortOrder: z.number(),
});
export type StampDefinitionRaw = z.infer<typeof StampDefinitionRawSchema>;

export const EarnedStampRawSchema = z.object({
  stampId: z.string(),
  earnedAt: z.string(),
  activityId: z.string().optional(),
  context: z.unknown().optional(),
});
export type EarnedStampRaw = z.infer<typeof EarnedStampRawSchema>;

export const ListStampsResponseSchema = z.object({
  catalog: z.array(StampDefinitionRawSchema),
  earned: z.array(EarnedStampRawSchema),
});
export type ListStampsResponse = z.infer<typeof ListStampsResponseSchema>;

export const ReevaluateResponseSchema = z.object({
  awarded: z.array(z.string()).nullable(),
});
export type ReevaluateResponse = z.infer<typeof ReevaluateResponseSchema>;
