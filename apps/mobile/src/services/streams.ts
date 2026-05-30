import { apiGet } from './api';
import type { ActivityStream, StreamType, StreamsResponse } from '@runstamp/shared-types';

export type { ActivityStream, StreamType, StreamsResponse };

export function getActivityStreams(
  activityId: string,
  idToken: string | null,
): Promise<StreamsResponse> {
  return apiGet<StreamsResponse>(`/v1/activities/${activityId}/streams`, { idToken });
}
