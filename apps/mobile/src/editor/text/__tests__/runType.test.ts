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
  it('covers all five run kinds with human labels', () => {
    expect(RUN_TYPE_PRESETS.map((p) => p.kind)).toEqual(['easy', 'long', 'workout', 'travel', 'race']);
    expect(RUN_TYPE_PRESETS.every((p) => p.label.length > 0)).toBe(true);
  });
});
