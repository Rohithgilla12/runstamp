import { describe, expect, it } from 'vitest';

import {
  distUnit,
  fmtDist,
  fmtPace,
  fmtTime,
  paceUnit,
} from '../sample';

describe('fmtPace', () => {
  it('formats sec/km as M:SS by default', () => {
    expect(fmtPace(330)).toBe('5:30');
  });

  it('formats sec/km as M:SS when units = km is passed explicitly', () => {
    expect(fmtPace(330, 'km')).toBe('5:30');
  });

  it('converts sec/km to sec/mi (multiplies by 1.609) when units = mi', () => {
    // 330 * 1.609 = 530.97 -> round to 531 -> 8:51
    expect(fmtPace(330, 'mi')).toBe('8:51');
  });

  it('zero-pads seconds < 10', () => {
    expect(fmtPace(305)).toBe('5:05');
  });

  it('rounds fractional seconds', () => {
    // 330.4 -> 330 -> 5:30
    expect(fmtPace(330.4)).toBe('5:30');
    // 330.6 -> 331 -> 5:31
    expect(fmtPace(330.6)).toBe('5:31');
  });

  it('handles zero pace', () => {
    expect(fmtPace(0)).toBe('0:00');
  });

  it('handles very large paces', () => {
    // 3661 sec -> 61:01 (no hours bucket in fmtPace)
    expect(fmtPace(3661)).toBe('61:01');
  });
});

describe('fmtTime', () => {
  it('formats 125 seconds as 2:05', () => {
    expect(fmtTime(125)).toBe('2:05');
  });

  it('formats 3725 seconds as 1:02:05', () => {
    expect(fmtTime(3725)).toBe('1:02:05');
  });

  it('formats 0 seconds as 0:00', () => {
    expect(fmtTime(0)).toBe('0:00');
  });

  it('zero-pads minutes and seconds when hours are present', () => {
    // 1h 0m 5s -> 1:00:05
    expect(fmtTime(3605)).toBe('1:00:05');
  });

  it('does not zero-pad minutes when hours are absent', () => {
    // 0h 1m 5s -> 1:05
    expect(fmtTime(65)).toBe('1:05');
  });

  it('handles exactly one hour', () => {
    expect(fmtTime(3600)).toBe('1:00:00');
  });

  it('handles very large durations', () => {
    // 10h 0m 0s
    expect(fmtTime(36000)).toBe('10:00:00');
  });

  it('rounds fractional seconds', () => {
    // VDOT / Riegel predictions return floats; we must not show the noise.
    expect(fmtTime(409.05)).toBe('6:49');
    expect(fmtTime(1388.59)).toBe('23:09');
    expect(fmtTime(2880.35)).toBe('48:00');
    expect(fmtTime(13242.15)).toBe('3:40:42');
  });

  it('carries rounding into the next minute', () => {
    expect(fmtTime(59.7)).toBe('1:00');
    expect(fmtTime(3599.8)).toBe('1:00:00');
  });
});

describe('fmtDist', () => {
  it('formats km with two decimals by default', () => {
    expect(fmtDist(10)).toBe('10.00');
  });

  it('formats km with two decimals when units = km is explicit', () => {
    expect(fmtDist(10, 'km')).toBe('10.00');
  });

  it('converts km to miles when units = mi (divides by 1.609)', () => {
    // 10 / 1.609 = 6.2150... -> '6.22'
    expect(fmtDist(10, 'mi')).toBe('6.22');
  });

  it('handles zero', () => {
    expect(fmtDist(0)).toBe('0.00');
    expect(fmtDist(0, 'mi')).toBe('0.00');
  });

  it('handles fractional km', () => {
    expect(fmtDist(1.234)).toBe('1.23');
  });

  it('handles very large distances', () => {
    expect(fmtDist(1000)).toBe('1000.00');
  });
});

describe('distUnit', () => {
  it("returns 'km' for km", () => {
    expect(distUnit('km')).toBe('km');
  });

  it("returns 'mi' for mi", () => {
    expect(distUnit('mi')).toBe('mi');
  });

  it("defaults to 'km' when no arg passed", () => {
    expect(distUnit()).toBe('km');
  });
});

describe('paceUnit', () => {
  it("returns '/km' for km", () => {
    expect(paceUnit('km')).toBe('/km');
  });

  it("returns '/mi' for mi", () => {
    expect(paceUnit('mi')).toBe('/mi');
  });

  it("defaults to '/km' when no arg passed", () => {
    expect(paceUnit()).toBe('/km');
  });
});
