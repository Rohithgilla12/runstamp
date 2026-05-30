import { z } from 'zod';

export const ActivitySourceSchema = z.enum(['strava', 'apple_health', 'manual']);
export type ActivitySource = z.infer<typeof ActivitySourceSchema>;

export const ApiActivitySchema = z.object({
  id: z.string(),
  source: ActivitySourceSchema,
  externalId: z.string(),
  sport: z.string(),
  startedAt: z.string(),
  title: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  distanceM: z.number(),
  elapsedSec: z.number(),
  movingSec: z.number().optional(),
  elevationM: z.number().optional(),
  avgHr: z.number().optional(),
  maxHr: z.number().optional(),
  avgPaceSPerKm: z.number().optional(),
  calories: z.number().optional(),
  cadenceSpm: z.number().optional(),
  runningPowerW: z.number().optional(),
  vo2maxMlKgMin: z.number().optional(),
  gapSecPerKm: z.number().optional(),
  startLat: z.number().optional(),
  startLon: z.number().optional(),
});
export type ApiActivity = z.infer<typeof ApiActivitySchema>;

export const ApiDupeRefSchema = z.object({
  id: z.string(),
  source: z.string(),
  startedAt: z.string(),
  distanceMeters: z.number(),
  elapsedSeconds: z.number(),
});
export type ApiDupeRef = z.infer<typeof ApiDupeRefSchema>;

export const ApiActivityDetailSchema = ApiActivitySchema.extend({
  // Raw splits are heterogeneous by source (Strava {k,sec,hr} vs HealthKit
  // {index,distanceM,durationSec,avgHr}); the client normalizes them. Validate
  // only that it's an array, not the per-item shape.
  splits: z.array(z.unknown()).optional(),
  notes: z.string().optional(),
  relatedDupes: z.array(ApiDupeRefSchema).optional(),
});
export type ApiActivityDetail = z.infer<typeof ApiActivityDetailSchema>;

export const ListActivitiesResponseSchema = z.object({
  activities: z.array(ApiActivitySchema),
  total: z.number(),
});
export type ListActivitiesResponse = z.infer<typeof ListActivitiesResponseSchema>;
