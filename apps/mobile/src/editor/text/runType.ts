import type { Activity } from '../../data/models';

// Quick-pick labels surfaced as chips in the run-type editor. Selecting one
// stores it as the override text; templates uppercase it as needed.
export const RUN_TYPE_PRESETS: string[] = [
  'Easy run',
  'Long run',
  'Speed workout',
  'Travel run',
  'Race',
  'MAF run',
  'Tempo',
  'Intervals',
];

// The user-set run-type override, trimmed; null when the run has none.
export function runTypeOverride(run: Pick<Activity, 'categoryLabel'>): string | null {
  const t = run.categoryLabel?.trim();
  return t ? t : null;
}
