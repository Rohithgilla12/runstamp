import { describe, expect, it } from 'vitest';
import { applyTheme } from '../themedSticker';
import type { StickerTheme } from '../../layouts/types';

const defaults = {
  container: { backgroundColor: 'rgba(20,17,13,0.55)', borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(243,237,226,0.2)' },
  text: { color: '#f3ede2', fontFamily: 'monoMedium' as const },
  eyebrow: { color: 'rgba(243,237,226,0.55)' },
};

describe('applyTheme', () => {
  it('returns defaults when theme is empty', () => {
    const out = applyTheme(defaults, {});
    expect(out).toEqual(defaults);
  });

  it('overrides container fields the theme specifies', () => {
    const theme: StickerTheme = { container: { backgroundColor: '#f3ede2', borderColor: '#e85d2f' } };
    const out = applyTheme(defaults, theme);
    expect(out.container.backgroundColor).toBe('#f3ede2');
    expect(out.container.borderColor).toBe('#e85d2f');
    expect(out.container.borderRadius).toBe(10);
    expect(out.container.borderWidth).toBe(1.5);
  });

  it('overrides text fields the theme specifies', () => {
    const theme: StickerTheme = { text: { color: '#14110d', textTransform: 'uppercase' } };
    const out = applyTheme(defaults, theme);
    expect(out.text.color).toBe('#14110d');
    expect(out.text.textTransform).toBe('uppercase');
    expect(out.text.fontFamily).toBe('monoMedium');
  });

  it('per-instance overrides win over theme', () => {
    const theme: StickerTheme = { text: { color: '#14110d' } };
    const overrides: StickerTheme = { text: { color: '#e85d2f' } };
    const out = applyTheme(defaults, theme, overrides);
    expect(out.text.color).toBe('#e85d2f');
  });

  it('does not mutate inputs', () => {
    const theme: StickerTheme = { container: { backgroundColor: '#fff' } };
    const before = JSON.stringify(defaults);
    applyTheme(defaults, theme);
    expect(JSON.stringify(defaults)).toBe(before);
  });
});
