// Mirrors `targets/runstamp-widget/WidgetSnapshot.swift`. The shape is the
// JSON we serialise into the App Group's UserDefaults under
// `WIDGET_SNAPSHOT_KEY` so the widget extension (Home Screen + Lock Screen /
// Apple Watch Smart Stack accessories) can decode it.
//
// If you change a field on either side, change the other.

export const WIDGET_APP_GROUP = 'group.fun.gilla.runstamp';
export const WIDGET_SNAPSHOT_KEY = 'runstamp.snapshot.v1';

export type WidgetUnits = 'km' | 'mi';

export type WidgetDayState = 'past-run' | 'past-quiet' | 'today' | 'future';

export interface WidgetDayDot {
  weekday: string; // single letter — Sun-first: S M T W T F S
  state: WidgetDayState;
}

export interface WidgetLatestRun {
  id: string;
  title: string;
  place: string;
  distanceLabel: string; // e.g. "8.42"
  units: WidgetUnits;
  paceLabel: string; // e.g. "5:12"
  dateLabel: string; // e.g. "Tue · May 12"
}

export interface WidgetSnapshot {
  // ISO-8601 from `Date.toISOString()` (includes fractional seconds). The
  // Swift mirror keeps this as String — decoding as Date via `.iso8601`
  // rejects `.000Z` and falls back to the placeholder "Evening loop" run.
  updatedAt: string;
  units: WidgetUnits;
  weekDistanceLabel: string; // formatted distance in user units
  weekRuns: number;
  weekSeconds: number;
  vsLastDistanceLabel: string; // signed delta, e.g. "+3.2" or "−1.1"
  weekDots: WidgetDayDot[];
  latestRun: WidgetLatestRun | null;
  stampCount: number;
  lastStampName: string | null;
}
