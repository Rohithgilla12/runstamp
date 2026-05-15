import { apiFetch } from './api';

export async function renameActivity(
  activityId: string,
  title: string,
  idToken: string | null,
): Promise<void> {
  await apiFetch(`/v1/activities/${activityId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
    idToken,
  });
}
