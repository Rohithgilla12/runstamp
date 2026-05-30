import { apiGet, apiPost } from './api';
import type {
  ApiActivity,
  ApiActivityDetail,
  ApiDupeRef,
  ListActivitiesResponse,
} from '@runstamp/shared-types';

export type { ApiActivity, ApiActivityDetail, ApiDupeRef, ListActivitiesResponse };

// Pull the full history by default — analytics, places, best-efforts all
// compute client-side off the same in-memory list, so capping it here means
// "the user thinks Runstamp only knows 50 of their 5,000 runs."
export function listActivities(
  idToken: string | null,
  limit = 10000,
): Promise<ListActivitiesResponse> {
  return apiGet<ListActivitiesResponse>(`/v1/activities?limit=${limit}`, { idToken });
}

export function getActivityDetail(
  id: string,
  idToken: string | null,
): Promise<ApiActivityDetail> {
  return apiGet<ApiActivityDetail>(`/v1/activities/${encodeURIComponent(id)}`, { idToken });
}

// Promote a duplicate row to canonical. Returns the freshly canonicalized
// detail so callers don't need a second fetch.
export function canonicalizeActivity(
  id: string,
  idToken: string | null,
): Promise<ApiActivityDetail> {
  return apiPost<ApiActivityDetail>(`/v1/activities/${encodeURIComponent(id)}/canonicalize`, undefined, { idToken });
}
