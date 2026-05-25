import type { ComponentType } from 'react';
import type { Activity, Point, Split } from '../../data/sample';

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
  | 'riso';

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

export interface Layout {
  id: LayoutId;
  name: string;
  Scaffolding: Scaffolding;
  theme: StickerTheme;
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
