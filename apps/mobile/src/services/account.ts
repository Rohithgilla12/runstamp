import { apiDelete } from './api';

/** Hard-deletes the caller's Runstamp account. Cascades to every owned row. */
export function deleteAccount(idToken: string | null): Promise<void> {
  return apiDelete('/v1/me', { idToken });
}
