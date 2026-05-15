import { apiPost } from './api';

export interface BackfillResponse {
  updated: number;
  awardedStamps?: string[] | null;
}

export function backfillPlaces(idToken: string | null): Promise<BackfillResponse> {
  return apiPost<BackfillResponse>('/v1/places/backfill', {}, { idToken });
}
