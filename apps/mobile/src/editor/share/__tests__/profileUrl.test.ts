import { describe, expect, it } from 'vitest';
import { profileUrl, shouldShowProfileStamp } from '../profileUrl';

describe('profileUrl', () => {
  it('builds the canonical gilla.fun album url', () => {
    expect(profileUrl('rohith')).toBe('https://runstamp.gilla.fun/u/rohith');
  });
  it('encodes the handle', () => {
    expect(profileUrl('a b')).toBe('https://runstamp.gilla.fun/u/a%20b');
  });
});

describe('shouldShowProfileStamp', () => {
  it('true only when public and handle present', () => {
    expect(shouldShowProfileStamp({ profilePublic: true, handle: 'rohith' })).toBe(true);
  });
  it('false when private', () => {
    expect(shouldShowProfileStamp({ profilePublic: false, handle: 'rohith' })).toBe(false);
  });
  it('false when no handle', () => {
    expect(shouldShowProfileStamp({ profilePublic: true })).toBe(false);
  });
  it('false when undefined', () => {
    expect(shouldShowProfileStamp(undefined)).toBe(false);
  });
});
