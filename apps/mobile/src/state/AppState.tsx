import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AccentKey, Units } from '../design/theme';
import { DEFAULT_TILE_STYLE, type TileStyle } from '../services/mapTiles';

interface AppStateValue {
  dark: boolean;
  accent: AccentKey;
  units: Units;
  hasOnboarded: boolean;
  tileStyle: TileStyle;
  setDark: (v: boolean) => void;
  setAccent: (v: AccentKey) => void;
  setUnits: (v: Units) => void;
  setHasOnboarded: (v: boolean) => void;
  setTileStyle: (v: TileStyle) => void;
}

const AppStateCtx = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState<AccentKey>('solar');
  const [units, setUnits] = useState<Units>('km');
  // Skip onboarding in v0 dev — we want the home screen on launch.
  // Onboarding lives behind a "Show onboarding" toggle in Settings.
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [tileStyle, setTileStyle] = useState<TileStyle>(DEFAULT_TILE_STYLE);

  const value = useMemo<AppStateValue>(
    () => ({ dark, accent, units, hasOnboarded, tileStyle, setDark, setAccent, setUnits, setHasOnboarded, setTileStyle }),
    [dark, accent, units, hasOnboarded, tileStyle]
  );

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState(): AppStateValue {
  const v = useContext(AppStateCtx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
