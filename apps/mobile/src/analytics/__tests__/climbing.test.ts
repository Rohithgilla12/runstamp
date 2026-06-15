import { describe, expect, it } from 'vitest';
import { totalVerticalM, everests, comparison } from '../climbing';

describe('totalVerticalM', () => {
  it('sums positive elevation, ignoring missing/negative/NaN', () => {
    expect(totalVerticalM([{ elev: 100 }, { elev: 250 }, { elev: -5 }, { elev: NaN }])).toBe(350);
  });
  it('is 0 for empty', () => {
    expect(totalVerticalM([])).toBe(0);
  });
});

describe('everests', () => {
  it('divides by Everest height', () => {
    expect(everests(8849)).toBeCloseTo(1);
    expect(everests(17698)).toBeCloseTo(2);
  });
});

describe('comparison', () => {
  it('picks the tallest landmark climbed at least once', () => {
    expect(comparison(9000).label).toBe('Everest');
    expect(comparison(1000).label).toBe('Burj Khalifa');
  });
  it('falls back to the smallest landmark below all thresholds', () => {
    const c = comparison(100);
    expect(c.label).toBe('Eiffel Tower');
    expect(c.count).toBeLessThan(1);
  });
});
