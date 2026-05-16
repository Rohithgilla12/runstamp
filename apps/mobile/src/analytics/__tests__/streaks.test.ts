import { describe, expect, it } from 'vitest';
import { computeStreaks } from '../streaks';

const ref = new Date('2026-05-16T12:00:00Z');

describe('computeStreaks', () => {
  it('returns zeros for empty input', () => {
    expect(computeStreaks([], ref)).toEqual({ current: 0, longest: 0 });
  });

  it('counts a single run today as current=1 longest=1', () => {
    expect(computeStreaks([{ date: '2026-05-16' }], ref)).toEqual({ current: 1, longest: 1 });
  });

  it('current streak extends back through consecutive days', () => {
    const rows = [
      { date: '2026-05-14' },
      { date: '2026-05-15' },
      { date: '2026-05-16' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 3, longest: 3 });
  });

  it('treats yesterday as the anchor when no run today', () => {
    const rows = [
      { date: '2026-05-14' },
      { date: '2026-05-15' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 2, longest: 2 });
  });

  it('current is 0 if last run is more than 1 day ago', () => {
    const rows = [
      { date: '2026-05-13' },
      { date: '2026-05-14' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 0, longest: 2 });
  });

  it('longest is the max of all runs', () => {
    const rows = [
      { date: '2026-01-01' }, { date: '2026-01-02' }, { date: '2026-01-03' }, { date: '2026-01-04' },
      { date: '2026-05-15' }, { date: '2026-05-16' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 2, longest: 4 });
  });

  it('deduplicates multiple runs on the same day', () => {
    const rows = [
      { date: '2026-05-15' },
      { date: '2026-05-15' },
      { date: '2026-05-16' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 2, longest: 2 });
  });
});
