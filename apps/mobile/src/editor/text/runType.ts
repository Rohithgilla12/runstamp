import type { Activity, ActivityKind } from '../../data/models';

// Quick-pick presets surfaced as chips in the run-type editor. The label is
// the human text stored as the override; templates uppercase it as needed.
export const RUN_TYPE_PRESETS: { kind: ActivityKind; label: string }[] = [
  { kind: 'easy', label: 'Recovery run' },
  { kind: 'long', label: 'Long run' },
  { kind: 'workout', label: 'Speed workout' },
  { kind: 'travel', label: 'Travel run' },
  { kind: 'race', label: 'Race' },
];

// The user-set run-type override, trimmed; null when the run has none.
export function runTypeOverride(run: Pick<Activity, 'categoryLabel'>): string | null {
  const t = run.categoryLabel?.trim();
  return t ? t : null;
}
