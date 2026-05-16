import { describe, expect, it } from 'vitest';
import { zoneBounds, classifyAvgHr, DEFAULT_HR_MAX, DEFAULT_HR_RESTING } from '../hrZones';

describe('zoneBounds', () => {
  it('returns 5 zones with low<high in each', () => {
    const z = zoneBounds(190, 60);
    expect(z.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(z[i].low).toBeLessThan(z[i].high);
      if (i > 0) expect(z[i].low).toBeGreaterThanOrEqual(z[i - 1].high - 1);
    }
  });

  it('Z1 starts at resting + 50% reserve, Z5 tops at max', () => {
    const z = zoneBounds(190, 60);
    expect(z[0].low).toBeCloseTo(60 + 0.5 * 130, 0);
    expect(z[4].high).toBe(190);
  });
});

describe('classifyAvgHr', () => {
  it('returns null when avg_hr is 0 or missing', () => {
    expect(classifyAvgHr(0, 190, 60)).toBeNull();
    expect(classifyAvgHr(undefined, 190, 60)).toBeNull();
  });

  it('clamps low values to Z1', () => {
    expect(classifyAvgHr(50, 190, 60)).toBe(1);
  });

  it('clamps high values to Z5', () => {
    expect(classifyAvgHr(220, 190, 60)).toBe(5);
  });

  it('classifies mid values', () => {
    expect(classifyAvgHr(125, 190, 60)).toBe(1);
    expect(classifyAvgHr(140, 190, 60)).toBe(2);
    expect(classifyAvgHr(155, 190, 60)).toBe(3);
    expect(classifyAvgHr(170, 190, 60)).toBe(4);
    expect(classifyAvgHr(180, 190, 60)).toBe(5);
  });

  it('uses defaults when callers pass undefined', () => {
    expect(classifyAvgHr(155)).toBe(3);
    expect(DEFAULT_HR_MAX).toBe(190);
    expect(DEFAULT_HR_RESTING).toBe(60);
  });
});
