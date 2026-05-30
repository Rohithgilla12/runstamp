import type { ActivitySource } from '@runstamp/shared-types';

export type Point = readonly [number, number];
export type ActivityKind = 'easy' | 'long' | 'workout' | 'travel' | 'race';

// Normalized split shape the UI reads. Raw wire splits are heterogeneous by
// source and get coerced to this in useActivityDetail's normaliseSplits.
export interface Split {
  k: number;
  sec: number;
  hr: number;
}

export interface Weather {
  t: number;
  w: string;
  icon: 'sun' | 'cloud' | 'rain' | 'fog' | 'clear';
}

export interface Activity {
  id: string;
  source?: ActivitySource;
  /** Source-native id — Strava activity id or HealthKit workout UUID. */
  externalId?: string;
  date: string;
  day: string;
  time: string;
  title: string;
  place: string;
  city: string;
  country: string;
  distance: number;
  seconds: number;
  elev: number;
  pace: number;
  /** Grade-Adjusted Pace (sec/km); absent on indoor/unimported runs. */
  gapPace?: number;
  avgHr: number;
  maxHr: number;
  cal: number;
  cadence?: number;
  vo2max?: number;
  power?: number;
  startLat?: number;
  startLon?: number;
  splits?: Split[];
  streamHr?: number[];
  streamPace?: number[];
  notes?: string;
  weather: Weather;
  kind: ActivityKind;
}
