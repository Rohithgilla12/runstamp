import { createContext, useContext } from 'react';

export const ACCENTS = {
  solar:    { primary: '#e85d2f', deep: '#c44a1e', name: 'Solar' },
  electric: { primary: '#3a5cff', deep: '#2742c4', name: 'Electric' },
  moss:     { primary: '#4a6b3a', deep: '#3a5430', name: 'Moss' },
  ink:      { primary: '#14110d', deep: '#000000', name: 'Ink' }
} as const;

export type AccentKey = keyof typeof ACCENTS;
export type Units = 'km' | 'mi';

export interface Theme {
  dark: boolean;
  accent: AccentKey;
  units: Units;
}

export interface Palette {
  paper: string;
  paper2: string;
  paper3: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  line2: string;
  accent: string;
  accentDeep: string;
  moss: string;
  warn: string;
  sky: string;
  // Tokens for text/dividers that sit ON `ink` surfaces (polarity-flipped hero
  // cards). Flip with mode so paper-tinted text on dark ink in light mode
  // becomes ink-tinted text on cream ink in dark mode.
  onInk2: string;
  onInk3: string;
  onInkDivider: string;
}

export const ThemeCtx = createContext<Theme>({ dark: false, accent: 'solar', units: 'km' });
export const useTheme = () => useContext(ThemeCtx);

export function paletteFor(theme: Theme): Palette {
  const a = ACCENTS[theme.accent] ?? ACCENTS.solar;
  if (theme.dark) {
    return {
      paper: '#0e0d0b',
      paper2: '#1a1714',
      paper3: '#22201c',
      ink: '#f3ede2',
      ink2: '#c9c0b1',
      ink3: '#8a8170',
      line: 'rgba(243,237,226,0.12)',
      line2: 'rgba(243,237,226,0.06)',
      accent: a.primary,
      accentDeep: a.deep,
      moss: '#7a9a6a',
      warn: '#d4a667',
      sky: '#6da6c4',
      onInk2: 'rgba(20,17,13,0.70)',
      onInk3: 'rgba(20,17,13,0.50)',
      onInkDivider: 'rgba(20,17,13,0.12)'
    };
  }
  return {
    paper: '#f3ede2',
    paper2: '#ebe3d3',
    paper3: '#e2d8c4',
    ink: '#14110d',
    ink2: '#3a342b',
    ink3: '#75695a',
    line: 'rgba(20,17,13,0.10)',
    line2: 'rgba(20,17,13,0.06)',
    accent: a.primary,
    accentDeep: a.deep,
    moss: '#4a6b3a',
    warn: '#c0833a',
    sky: '#3c6e8c',
    onInk2: 'rgba(243,237,226,0.70)',
    onInk3: 'rgba(243,237,226,0.50)',
    onInkDivider: 'rgba(243,237,226,0.12)'
  };
}

export function useColors(): Palette {
  return paletteFor(useTheme());
}
