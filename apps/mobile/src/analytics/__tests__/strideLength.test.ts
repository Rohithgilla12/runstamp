import { describe, expect, it } from 'vitest';
import { currentStride, deltaStride, strideSeries } from '../strideLength';

describe('strideSeries', () => {
  it('computes stride length from speed + cadence', () => {
    // 5 km in 1500 s = 3.333 m/s. At 180 spm = 3 steps/sec → SL = 1.111 m.
    const series = strideSeries([
      { date: '2026-05-01', distance: 5, seconds: 1500, cadence: 180 },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].value).toBeCloseTo(1.111, 3);
  });

  it('drops rows missing cadence', () => {
    const series = strideSeries([
      { date: '2026-05-01', distance: 5, seconds: 1500 },
      { date: '2026-05-02', distance: 5, seconds: 1500, cadence: 0 },
    ]);
    expect(series).toHaveLength(0);
  });

  it('drops biomechanically impossible values (>3m / <0.4m)', () => {
    const series = strideSeries([
      { date: '2026-05-01', distance: 100, seconds: 1, cadence: 180 }, // impossible
      { date: '2026-05-02', distance: 1, seconds: 9999, cadence: 180 }, // walking
    ]);
    expect(series).toHaveLength(0);
  });

  it('sorts ascending by date', () => {
    const series = strideSeries([
      { date: '2026-05-15', distance: 5, seconds: 1500, cadence: 180 },
      { date: '2026-05-01', distance: 5, seconds: 1500, cadence: 175 },
    ]);
    expect(series.map((p) => p.date)).toEqual(['2026-05-01', '2026-05-15']);
  });
});

describe('currentStride', () => {
  it('returns null on empty', () => {
    expect(currentStride([])).toBeNull();
  });
  it('returns the most recent value', () => {
    const s = [
      { date: '2026-01-01', value: 1.05 },
      { date: '2026-05-01', value: 1.18 },
    ];
    expect(currentStride(s)).toBe(1.18);
  });
});

describe('deltaStride', () => {
  it('compares last 28d vs prior 28-60d window', () => {
    const ref = new Date(2026, 4, 16);
    const s = [
      { date: '2026-03-20', value: 1.05 },
      { date: '2026-04-01', value: 1.07 },
      { date: '2026-05-01', value: 1.15 },
      { date: '2026-05-14', value: 1.17 },
    ];
    // recent avg 1.16, baseline 1.06 → delta 0.10
    expect(deltaStride(s, ref)).toBe(0.1);
  });
  it('returns null without data on either side', () => {
    expect(deltaStride([], new Date())).toBeNull();
  });
});
