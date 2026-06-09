import { describe, expect, it } from 'vitest';
import { RUN_TYPE_PRESETS, runTypeOverride } from '../runType';

describe('runTypeOverride', () => {
  it('returns the trimmed override when set', () => {
    expect(runTypeOverride({ categoryLabel: '  Recovery run ' })).toBe('Recovery run');
  });

  it('returns null when unset', () => {
    expect(runTypeOverride({ categoryLabel: undefined })).toBeNull();
  });

  it('returns null when blank', () => {
    expect(runTypeOverride({ categoryLabel: '   ' })).toBeNull();
  });
});

describe('RUN_TYPE_PRESETS', () => {
  it('lists the quick-pick run-type labels', () => {
    expect(RUN_TYPE_PRESETS).toEqual([
      'Easy run',
      'Long run',
      'Speed workout',
      'Travel run',
      'Race',
      'MAF run',
      'Tempo',
      'Intervals',
    ]);
  });

  it('has no empty labels', () => {
    expect(RUN_TYPE_PRESETS.every((l) => l.length > 0)).toBe(true);
  });
});
