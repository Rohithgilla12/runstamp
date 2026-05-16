import { describe, expect, it } from 'vitest';
import { monthlyCumulative } from '../cumulative';

const ref = new Date('2026-05-16T12:00:00Z');

describe('monthlyCumulative', () => {
  it('returns empty for empty input', () => {
    expect(monthlyCumulative([], ref)).toEqual([]);
  });

  it('cumulates a single month', () => {
    const out = monthlyCumulative(
      [
        { date: '2026-05-01', distance: 5 },
        { date: '2026-05-10', distance: 10 },
      ],
      ref,
    );
    expect(out).toEqual([
      { ym: '2026-05', monthlyKm: 15, cumulativeKm: 15 },
    ]);
  });

  it('fills gap months with 0 monthlyKm but carries cumulative', () => {
    const out = monthlyCumulative(
      [
        { date: '2026-01-15', distance: 100 },
        { date: '2026-04-05', distance: 50 },
      ],
      ref,
    );
    expect(out.length).toBe(5);
    expect(out[0]).toEqual({ ym: '2026-01', monthlyKm: 100, cumulativeKm: 100 });
    expect(out[1]).toEqual({ ym: '2026-02', monthlyKm: 0, cumulativeKm: 100 });
    expect(out[2]).toEqual({ ym: '2026-03', monthlyKm: 0, cumulativeKm: 100 });
    expect(out[3]).toEqual({ ym: '2026-04', monthlyKm: 50, cumulativeKm: 150 });
    expect(out[4]).toEqual({ ym: '2026-05', monthlyKm: 0, cumulativeKm: 150 });
  });

  it('spans multiple years', () => {
    const out = monthlyCumulative(
      [
        { date: '2024-11-15', distance: 50 },
        { date: '2026-01-10', distance: 25 },
      ],
      ref,
    );
    expect(out.length).toBe(19);
    expect(out[0].ym).toBe('2024-11');
    expect(out[out.length - 1].ym).toBe('2026-05');
    expect(out[out.length - 1].cumulativeKm).toBe(75);
  });
});
