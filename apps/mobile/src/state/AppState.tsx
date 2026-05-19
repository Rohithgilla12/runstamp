// AppState — global UI preferences (dark mode, accent, units, onboarding,
// tile basemap style). Persisted to the server via /v1/me so a preference
// chosen on one device survives cold launches AND comes back when the user
// signs in on another device.
//
// Architecture:
// - Local state is the source of truth at render time. Updating it is sync
//   so the UI reacts immediately.
// - On useAccount.me load, we hydrate the local state from server values
//   (if present). Server `null` columns mean "use the client default" — we
//   leave the local state alone so a brand-new user still sees the brand
//   defaults instead of a server-forced choice.
// - Setters fire-and-forget a PATCH /v1/me. We don't await: the UI never
//   waits on the network for a preference change. A failed save logs to the
//   console and the next save retries.
// - This provider lives INSIDE AccountProvider in App.tsx so useAccount is
//   available; AccountProvider in turn sits inside AuthProvider since /v1/me
//   needs an auth token.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AccentKey, Units } from '../design/theme';
import { DEFAULT_TILE_STYLE, type TileStyle } from '../services/mapTiles';
import { useAccount } from './useAccount';

// Default share surface — what the editor opens to when there's no
// per-run override. Client-only for the moment; server persistence pending
// a `ui_default_surface` column on users (one migration away).
export type DefaultSurface = '9:16' | '1:1' | '4:5';

interface AppStateValue {
  dark: boolean;
  accent: AccentKey;
  units: Units;
  hasOnboarded: boolean;
  tileStyle: TileStyle;
  defaultSurface: DefaultSurface;
  setDark: (v: boolean) => void;
  setAccent: (v: AccentKey) => void;
  setUnits: (v: Units) => void;
  setHasOnboarded: (v: boolean) => void;
  setTileStyle: (v: TileStyle) => void;
  setDefaultSurface: (v: DefaultSurface) => void;
}

const AppStateCtx = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const account = useAccount();
  const me = account.me;
  const save = account.save;

  const [dark, setDarkLocal] = useState(false);
  const [accent, setAccentLocal] = useState<AccentKey>('solar');
  const [units, setUnitsLocal] = useState<Units>('km');
  // Mobile defaults to "already onboarded" for dev. Real persistence makes
  // this honest — first-time users start with NULL on the server, we hydrate
  // to false on me load, and the onboarding flow fires.
  const [hasOnboarded, setHasOnboardedLocal] = useState(true);
  const [tileStyle, setTileStyleLocal] = useState<TileStyle>(DEFAULT_TILE_STYLE);
  const [defaultSurface, setDefaultSurfaceLocal] = useState<DefaultSurface>('9:16');

  // Hydrate from the server me row once it lands. We only overwrite local
  // state when the server has a non-null value — null means "user hasn't
  // chosen" and the local default stands.
  //
  // Guarded by a ref so a save callback that updates `me` doesn't re-trigger
  // hydration and clobber an in-flight setX (or worse, ping-pong values).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!me || hydratedRef.current) return;
    if (me.uiDark != null) setDarkLocal(me.uiDark);
    if (me.uiAccent != null) setAccentLocal(me.uiAccent as AccentKey);
    if (me.uiTileStyle != null) setTileStyleLocal(me.uiTileStyle as TileStyle);
    if (me.uiOnboarded != null) setHasOnboardedLocal(me.uiOnboarded);
    // units: server stores 'metric' / 'imperial' on the existing `units`
    // column; mobile uses 'km' / 'mi'. Translate in both directions.
    if (me.units === 'imperial') setUnitsLocal('mi');
    else if (me.units === 'metric') setUnitsLocal('km');
    hydratedRef.current = true;
  }, [me]);

  // Reset the hydration flag when the user signs out so the next sign-in
  // re-hydrates fresh.
  useEffect(() => {
    if (!me) hydratedRef.current = false;
  }, [me]);

  // Setters update local state synchronously and fire-and-forget a save.
  // We pass `save` through a ref so closure capture doesn't pin a stale
  // version — useCallback would create new identities every me update.
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  const setDark = (v: boolean) => {
    setDarkLocal(v);
    saveRef.current({ uiDark: v }).catch((e) => console.warn('[AppState] save uiDark failed', e));
  };
  const setAccent = (v: AccentKey) => {
    setAccentLocal(v);
    saveRef.current({ uiAccent: v }).catch((e) => console.warn('[AppState] save uiAccent failed', e));
  };
  const setUnits = (v: Units) => {
    setUnitsLocal(v);
    const server = v === 'mi' ? 'imperial' : 'metric';
    saveRef.current({ units: server }).catch((e) => console.warn('[AppState] save units failed', e));
  };
  const setHasOnboarded = (v: boolean) => {
    setHasOnboardedLocal(v);
    saveRef.current({ uiOnboarded: v }).catch((e) => console.warn('[AppState] save uiOnboarded failed', e));
  };
  const setTileStyle = (v: TileStyle) => {
    setTileStyleLocal(v);
    saveRef.current({ uiTileStyle: v }).catch((e) => console.warn('[AppState] save uiTileStyle failed', e));
  };
  // defaultSurface stays client-only until the matching server column lands.
  const setDefaultSurface = (v: DefaultSurface) => setDefaultSurfaceLocal(v);

  const value = useMemo<AppStateValue>(
    () => ({ dark, accent, units, hasOnboarded, tileStyle, defaultSurface, setDark, setAccent, setUnits, setHasOnboarded, setTileStyle, setDefaultSurface }),
    [dark, accent, units, hasOnboarded, tileStyle, defaultSurface],
  );

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState(): AppStateValue {
  const v = useContext(AppStateCtx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
