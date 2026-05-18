import { apiDelete, apiGet, apiPatch } from './api';

export interface MeResponse {
  userId: string;
  email: string;
  firebaseUid: string;
  displayName?: string;
  homeCity?: string;
  units: string;
  hrMax?: number;
  hrResting?: number;
  birthYear?: number;
  // UI prefs. Omitted on a fresh row (server returns omitempty for NULL)
  // — mobile keeps its local default in that case.
  uiDark?: boolean;
  uiAccent?: string;
  uiTileStyle?: string;
  uiOnboarded?: boolean;
  hasStrava: boolean;
}

export interface ProfilePatch {
  displayName?: string;
  homeCity?: string;
  units?: 'metric' | 'imperial';
  hrMax?: number | null;
  hrResting?: number | null;
  birthYear?: number | null;
  uiDark?: boolean;
  uiAccent?: string;
  uiTileStyle?: string;
  uiOnboarded?: boolean;
}

export function getMe(idToken: string | null): Promise<MeResponse> {
  return apiGet<MeResponse>('/v1/me', { idToken });
}

export function patchMe(idToken: string | null, patch: ProfilePatch): Promise<MeResponse> {
  return apiPatch<MeResponse>('/v1/me', patch, { idToken });
}

/** Hard-deletes the caller's Runstamp account. Cascades to every owned row. */
export function deleteAccount(idToken: string | null): Promise<void> {
  return apiDelete('/v1/me', { idToken });
}
