// Shared layout primitives for share-card templates.
//
// Every template imports these so spacing, type sizes, and tonal values stay
// in lockstep across the family. Per .impeccable.md principle #3 (type
// carries the load) we keep eyebrow sizes uniform and let serif/mono sizes
// scale off the canvas width.

import type { Units } from '../../data/sample';

/**
 * Padding scale. Use these instead of raw numbers so a future tweak (e.g.
 * "bump inner padding for Stories" or "tighten for 1:1 square") is one edit
 * away from cascading through every template.
 */
export const PAD = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
} as const;

/** Eyebrow / micro-caps label font size — uniform across all surfaces. */
export const EYEBROW_SIZE = 9;

/** Eyebrow letterspacing — already the default in typography.tsx but kept
 * explicit here so per-call style overrides don't drift. */
export const EYEBROW_TRACKING = 1.2;

/** Tonal values used when a template intentionally bypasses the live theme
 * (Engraved is monochrome; Passport/Customs use warm-paper ecru). */
export const TONE = {
  paperWarm: '#f5eedf',
  paperPress: '#ede5d4',
  inkDark: '#1c1812',
  inkRich: '#14110d',
  scrimInk: 'rgba(14,13,11,0.55)',
  scrimInkSoft: 'rgba(14,13,11,0.32)',
} as const;

/** Three-letter month abbreviations used by every date helper. */
export const MONTHS_3 = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;

/** Format an ISO yyyy-mm-dd date as "14 MAY 2026". */
export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const m = MONTHS_3[(parseInt(month, 10) - 1) % 12] ?? '';
  return `${day} ${m} ${year}`;
}

/** Format an ISO yyyy-mm-dd date as "14 MAY 26" — for tight bottom strips. */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const m = MONTHS_3[(parseInt(month, 10) - 1) % 12] ?? '';
  return `${day} ${m} ${year.slice(2)}`;
}

/** Format an ISO yyyy-mm-dd date as "MAY 14" — for postmark wedges. */
export function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split('-');
  const m = MONTHS_3[(parseInt(month, 10) - 1) % 12] ?? '';
  return `${m} ${day}`;
}

/** Re-export Units so each template only imports from one file. */
export type { Units };
