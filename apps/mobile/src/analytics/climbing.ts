// Lifetime vertical climbed, framed against recognizable landmarks. Pure +
// react-native-free (vitest-testable).

export interface ClimbRow {
  elev: number; // metres of elevation gain for one activity
}

export interface Landmark {
  label: string;
  m: number;
}

// Tallest first — comparison() returns the most impressive landmark cleared.
export const LANDMARKS: readonly Landmark[] = [
  { label: 'Everest', m: 8849 },
  { label: 'Kilimanjaro', m: 5895 },
  { label: 'Mont Blanc', m: 4808 },
  { label: 'Burj Khalifa', m: 828 },
  { label: 'Eiffel Tower', m: 330 },
];

const EVEREST_M = LANDMARKS[0].m;

/** Sum of per-activity elevation gain, ignoring missing/negative values. */
export function totalVerticalM(rows: readonly ClimbRow[]): number {
  let sum = 0;
  for (const r of rows) {
    if (Number.isFinite(r.elev) && r.elev > 0) sum += r.elev;
  }
  return sum;
}

/** How many times up Everest. */
export function everests(meters: number): number {
  return meters / EVEREST_M;
}

export interface Comparison {
  label: string;
  count: number;
}

/** The tallest landmark climbed at least once; falls back to the smallest. */
export function comparison(meters: number): Comparison {
  for (const lm of LANDMARKS) {
    if (meters >= lm.m) return { label: lm.label, count: meters / lm.m };
  }
  const smallest = LANDMARKS[LANDMARKS.length - 1];
  return { label: smallest.label, count: meters / smallest.m };
}
