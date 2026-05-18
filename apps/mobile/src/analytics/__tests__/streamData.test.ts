import { describe, expect, it } from 'vitest';
import { parseValueStream } from '../streamData';

describe('parseValueStream', () => {
  it('returns Strava-shaped number arrays as-is', () => {
    expect(parseValueStream([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('extracts values from Apple Health {tStart, dtSec, values} shape', () => {
    const data = { tStart: 1778891131733, dtSec: 5, values: [2.49, 2.45, 2.43] };
    expect(parseValueStream(data)).toEqual([2.49, 2.45, 2.43]);
  });

  it('drops NaN and Infinity samples', () => {
    expect(parseValueStream([1, NaN, 2, Infinity, 3])).toEqual([1, 2, 3]);
  });

  it('returns null for null/undefined', () => {
    expect(parseValueStream(null)).toBeNull();
    expect(parseValueStream(undefined)).toBeNull();
  });

  it('returns null for empty arrays', () => {
    expect(parseValueStream([])).toBeNull();
  });

  it('returns null for empty values arrays', () => {
    expect(parseValueStream({ tStart: 0, dtSec: 1, values: [] })).toBeNull();
  });

  it('returns null when only one finite sample remains', () => {
    // StreamChart needs at least 2 points to draw a line; one-sample streams
    // (corrupt data, single-tick workouts) are treated as empty.
    expect(parseValueStream([42])).toBeNull();
    expect(parseValueStream({ values: [42] })).toBeNull();
  });

  it('returns null when data is an object without values', () => {
    expect(parseValueStream({ tStart: 0, dtSec: 1 })).toBeNull();
  });

  it('returns null when values is present but not an array', () => {
    expect(parseValueStream({ values: 'oops' })).toBeNull();
  });
});
