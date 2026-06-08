import { apiFetch } from './api';

export interface ActivityPatch {
  title?: string;
  city?: string;
  categoryLabel?: string;
}

// PATCHes only the provided fields. Empty strings are intentional "clear"
// signals — the backend maps blank → NULL.
export async function updateActivity(
  activityId: string,
  patch: ActivityPatch,
  idToken: string | null,
): Promise<void> {
  await apiFetch(`/v1/activities/${activityId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    idToken,
  });
}

export async function renameActivity(
  activityId: string,
  title: string,
  idToken: string | null,
): Promise<void> {
  await updateActivity(activityId, { title }, idToken);
}
