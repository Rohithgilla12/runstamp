import type { StickerTheme } from '../layouts/types';

export interface ResolvedStickerStyle {
  container: NonNullable<StickerTheme['container']>;
  text: NonNullable<StickerTheme['text']>;
  eyebrow: NonNullable<StickerTheme['eyebrow']>;
}

// Merge layers: defaults <- theme <- overrides.
// Each section is shallow-merged.
export function applyTheme(
  defaults: ResolvedStickerStyle,
  theme: StickerTheme,
  overrides: StickerTheme = {},
): ResolvedStickerStyle {
  return {
    container: { ...defaults.container, ...theme.container, ...overrides.container },
    text: { ...defaults.text, ...theme.text, ...overrides.text },
    eyebrow: { ...defaults.eyebrow, ...theme.eyebrow, ...overrides.eyebrow },
  };
}
