import type { DefaultSurface } from '../../state/AppState';

export type Sub = 'main' | 'connections' | 'privacy' | 'profile';

// Default-share cycle. Tapping the Settings row rotates through these.
// Order is sized by what most runners reach for first (Story → square → feed).
export const SURFACES: DefaultSurface[] = ['9:16', '1:1', '4:5'];
export const SURFACE_LABEL: Record<DefaultSurface, string> = {
  '9:16': 'Story',
  '1:1':  'Square',
  '4:5':  'Feed',
};
export function nextSurface(s: DefaultSurface): DefaultSurface {
  const i = SURFACES.indexOf(s);
  return SURFACES[(i + 1) % SURFACES.length];
}

// Streak: number of consecutive *days* up to and including today that contain
// at least one run. A 'rest day' breaks the streak.
export function computeStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0;
  const set = new Set(isoDates);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 730; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (set.has(key)) {
      streak += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function formatJoined(creationTime?: string): string | null {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  if (Number.isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}
