// Privacy zones — API client. Zones are server-stored circular regions
// that the mobile client masks routes against at render time.

import { apiDelete, apiGet, apiPost } from './api';

export interface PrivacyZone {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  radiusM: number;
}

interface ListResponse {
  zones: PrivacyZone[];
}

export function listPrivacyZones(idToken: string | null): Promise<PrivacyZone[]> {
  return apiGet<ListResponse>('/v1/privacy-zones', { idToken }).then((r) => r.zones ?? []);
}

export function createPrivacyZone(
  idToken: string | null,
  input: { name?: string; lat: number; lng: number; radiusM: number },
): Promise<PrivacyZone> {
  return apiPost<PrivacyZone>('/v1/privacy-zones', input, { idToken });
}

export function deletePrivacyZone(idToken: string | null, id: string): Promise<void> {
  return apiDelete(`/v1/privacy-zones/${encodeURIComponent(id)}`, { idToken });
}
