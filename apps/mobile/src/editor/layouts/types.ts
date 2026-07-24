import type { ComponentType } from 'react';
import type { Activity, Point, Split } from '../../data/models';

export type LayoutId =
  | 'none'
  | 'postage'
  | 'postmark'
  | 'boarding'
  | 'passport'
  | 'customs'
  | 'engraved'
  | 'wax'
  | 'minimal'
  | 'datestamp'
  | 'halftone'
  | 'cyanotype'
  | 'riso'
  | 'signature'
  | 'passport-window'
  | 'split-field';

export type StickerKey =
  | 'distance' | 'pace' | 'time' | 'hr' | 'elev' | 'cal'
  | 'cadence' | 'splits' | 'hrChart' | 'paceChart'
  | 'map' | 'date' | 'title' | 'place';

export type Surface = '9:16' | '1:1' | '4:5';
export type Background = 'map' | 'photo' | 'solid';

export interface ScaffoldingProps {
  width: number;
  height: number;
  surface: Surface;
}

export type Scaffolding = ComponentType<ScaffoldingProps>;

export interface StickerTheme {
  container?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    paddingHorizontal?: number;
    paddingVertical?: number;
  };
  text?: {
    color?: string;
    fontFamily?: string;
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'lowercase' | 'none';
  };
  eyebrow?: {
    color?: string;
    letterSpacing?: number;
  };
}

export interface StickerSeed {
  key: StickerKey;
  x: number;
  y: number;
  scale?: number;
}

// How a layout composes its card: a paper/ink/themed backdrop with the
// background image (map/photo) contained inside an inset frame — not bled to
// the edges — so the scaffolding decoration and stat stickers read as a
// designed artifact rather than "a map with boxes on it".
export interface FrameSpec {
  /** Fills the whole card behind everything (paper, ink, ecru, blue…). */
  backdrop: string;
  /** Inset of the contained background from the card edge, in px at the 9:16 preview. */
  inset: number;
  /** Corner radius of the contained background block. */
  radius: number;
  /** Map tile/route treatment for the contained background. */
  mapStyle: 'light' | 'dark';
  /** Opacity of the contained background — low lets the paper character lead. */
  mapOpacity: number;
  /** Overlay over the contained background for type contrast; 'transparent' = none. */
  scrim: string;
}

export interface Layout {
  id: LayoutId;
  name: string;
  Scaffolding: Scaffolding;
  theme: StickerTheme;
  /** Card composition. Absent = legacy full-bleed background (the 'none' option). */
  frame?: FrameSpec;
  seed?: StickerSeed[];
}

export interface LiveStreams {
  hr: number[] | null;
  pace: number[] | null;
  route: Point[] | null;
  splits: Split[] | null;
  rawLatLng: ReadonlyArray<readonly [number, number]> | null;
}

export interface StickerInstance {
  id: string;
  key: StickerKey;
  x: number;
  y: number;
  scale: number;
}

export type { Activity };
