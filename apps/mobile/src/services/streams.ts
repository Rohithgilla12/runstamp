import { apiGet } from './api';
import {
  StreamsResponseSchema,
  type ActivityStream,
  type StreamType,
  type StreamsResponse,
} from '@runstamp/shared-types';
import { parseOrWarn } from '../lib/validate';

export type { ActivityStream, StreamType, StreamsResponse };

export async function getActivityStreams(
  activityId: string,
  idToken: string | null,
): Promise<StreamsResponse> {
  const raw = await apiGet<unknown>(`/v1/activities/${activityId}/streams`, { idToken });
  return parseOrWarn(StreamsResponseSchema, raw, 'GET /v1/activities/:id/streams');
}
