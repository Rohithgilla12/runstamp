import { apiGet } from './api';

export interface BestEffort {
  distanceM: number;
  label: string;
  timeSeconds: number;
  achievedAt: string;
  activityId: string;
}

export interface BestEffortsResponse {
  efforts: BestEffort[];
}

export function listBestEfforts(idToken: string | null): Promise<BestEffortsResponse> {
  return apiGet<BestEffortsResponse>('/v1/best-efforts', { idToken });
}
