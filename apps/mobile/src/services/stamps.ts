import { apiGet, apiPost } from './api';

export type StampTier = 'common' | 'rare' | 'mythic';

export interface StampDefinitionRaw {
  id: string;
  name: string;
  description: string;
  tier: StampTier;
  category: string;
  criteria: unknown;
  sortOrder: number;
}

export interface EarnedStampRaw {
  stampId: string;
  earnedAt: string;
  activityId?: string;
  context?: unknown;
}

export interface ListStampsResponse {
  catalog: StampDefinitionRaw[];
  earned: EarnedStampRaw[];
}

export function listStamps(idToken: string | null): Promise<ListStampsResponse> {
  return apiGet<ListStampsResponse>('/v1/stamps', { idToken });
}

export interface ReevaluateResponse {
  awarded: string[] | null;
}

export function reevaluateStamps(idToken: string | null): Promise<ReevaluateResponse> {
  return apiPost<ReevaluateResponse>('/v1/stamps/reevaluate', {}, { idToken });
}
