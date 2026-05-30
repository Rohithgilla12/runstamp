import { z } from 'zod';

export const StreamTypeSchema = z.enum([
  'latlng',
  'heartrate',
  'altitude',
  'speed',
  'cadence',
  'power',
  'vertical_oscillation',
  'ground_contact_time',
  'stride_length',
]);
export type StreamType = z.infer<typeof StreamTypeSchema>;

export const ActivityStreamSchema = z.object({
  type: StreamTypeSchema,
  data: z.unknown(),
});
export type ActivityStream = z.infer<typeof ActivityStreamSchema>;

export const StreamsResponseSchema = z.object({
  activityId: z.string(),
  streams: z.array(ActivityStreamSchema).nullable(),
});
export type StreamsResponse = z.infer<typeof StreamsResponseSchema>;
