import { apiGet } from './api';

export type StreamType =
  | 'latlng'
  | 'heartrate'
  | 'altitude'
  | 'speed'
  | 'cadence'
  | 'power'
  | 'vertical_oscillation'
  | 'ground_contact_time'
  | 'stride_length';

export interface ActivityStream {
  type: StreamType;
  data: unknown;
}

export interface StreamsResponse {
  activityId: string;
  streams: ActivityStream[] | null;
}

export function getActivityStreams(
  activityId: string,
  idToken: string | null,
): Promise<StreamsResponse> {
  return apiGet<StreamsResponse>(`/v1/activities/${activityId}/streams`, { idToken });
}
