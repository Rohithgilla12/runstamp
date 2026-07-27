import type { FrameSpec, LayoutId } from './layouts/types';
import { FRAMES } from './layouts/frames';

export type BaseFill = 'paper' | 'ink' | 'solar';
export type RouteTreatment = 'signature' | 'pace-gradient' | 'plain';
export type ScrimMode = 'bottom' | 'top' | 'full' | 'none';
export type PhotoPlacement = 'full' | 'inset' | 'region-top';

export interface LayerStack {
  base: BaseFill;
  photo: { enabled: boolean; opacity: number; duotone: boolean; placement: PhotoPlacement };
  map: { enabled: boolean; opacity: number; style: 'light' | 'dark' };
  route: { enabled: boolean; opacity: number; treatment: RouteTreatment; strokeScale: number };
  scrim: { mode: ScrimMode; strength: number };
}

// Photo occupies the top 52% of the canvas in the Split field layout; the
// map+route band owns the rest. Shared by the scaffolding and the compositor.
export const SPLIT_TOP_FRACTION = 0.52;

export function signaturePreset(): LayerStack {
  return {
    base: 'ink',
    photo: { enabled: true, opacity: 1, duotone: false, placement: 'full' },
    map: { enabled: false, opacity: 1, style: 'dark' },
    route: { enabled: true, opacity: 1, treatment: 'signature', strokeScale: 1 },
    scrim: { mode: 'bottom', strength: 0.85 },
  };
}

export function passportWindowPreset(): LayerStack {
  return {
    base: 'paper',
    photo: { enabled: true, opacity: 1, duotone: false, placement: 'inset' },
    map: { enabled: true, opacity: 1, style: 'light' },
    route: { enabled: true, opacity: 1, treatment: 'signature', strokeScale: 0.9 },
    scrim: { mode: 'none', strength: 0 },
  };
}

export function splitFieldPreset(): LayerStack {
  return {
    base: 'ink',
    photo: { enabled: true, opacity: 1, duotone: false, placement: 'region-top' },
    map: { enabled: true, opacity: 1, style: 'light' },
    route: { enabled: true, opacity: 1, treatment: 'signature', strokeScale: 0.85 },
    scrim: { mode: 'bottom', strength: 0.7 },
  };
}

// Existing templates + 'none' derive their layer stack from FrameSpec so they
// render as before: map leads, route on, no photo. A frame whose scrim is
// 'transparent' (paper-forward layouts) maps to scrim 'none'.
export function frameSpecToLayers(frame: FrameSpec | undefined): LayerStack {
  if (!frame) {
    return {
      base: 'ink',
      photo: { enabled: false, opacity: 1, duotone: false, placement: 'full' },
      map: { enabled: true, opacity: 1, style: 'dark' },
      route: { enabled: true, opacity: 1, treatment: 'signature', strokeScale: 1 },
      scrim: { mode: 'none', strength: 0 },
    };
  }
  return {
    base: 'ink',
    photo: { enabled: false, opacity: 1, duotone: false, placement: 'full' },
    map: { enabled: true, opacity: frame.mapOpacity, style: frame.mapStyle },
    route: { enabled: true, opacity: 1, treatment: 'signature', strokeScale: 1 },
    scrim: { mode: 'none', strength: 0 },
  };
}

export const LAYER_PRESETS: Record<LayoutId, LayerStack> = {
  none: frameSpecToLayers(undefined),
  signature: signaturePreset(),
  'passport-window': passportWindowPreset(),
  'split-field': splitFieldPreset(),
  postage: frameSpecToLayers(FRAMES.postage),
  postmark: frameSpecToLayers(FRAMES.postmark),
  boarding: frameSpecToLayers(FRAMES.boarding),
  passport: frameSpecToLayers(FRAMES.passport),
  customs: frameSpecToLayers(FRAMES.customs),
  engraved: frameSpecToLayers(FRAMES.engraved),
  wax: frameSpecToLayers(FRAMES.wax),
  minimal: frameSpecToLayers(FRAMES.minimal),
  datestamp: frameSpecToLayers(FRAMES.datestamp),
  halftone: frameSpecToLayers(FRAMES.halftone),
  cyanotype: frameSpecToLayers(FRAMES.cyanotype),
  riso: frameSpecToLayers(FRAMES.riso),
};

export type ScrimStep = 'none' | 'soft' | 'medium' | 'strong';

const STEP_STRENGTH: Record<Exclude<ScrimStep, 'none'>, number> = {
  soft: 0.4,
  medium: 0.7,
  strong: 0.9,
};

// scrim.mode carries direction (top/bottom/full), which belongs to the layout
// preset. The shelf only moves strength, so an on-step keeps the preset's
// direction and a preset with no scrim gets the common bottom fade.
export function scrimStepToLayer(step: ScrimStep, currentMode: ScrimMode): LayerStack['scrim'] {
  if (step === 'none') return { mode: 'none', strength: 0 };
  return {
    mode: currentMode === 'none' ? 'bottom' : currentMode,
    strength: STEP_STRENGTH[step],
  };
}

export function layerToScrimStep(scrim: LayerStack['scrim']): ScrimStep {
  if (scrim.mode === 'none' || scrim.strength <= 0) return 'none';
  if (scrim.strength < 0.55) return 'soft';
  if (scrim.strength < 0.8) return 'medium';
  return 'strong';
}

// Only the four fields the shelf can edit. Scrim compares by step so a preset
// strength that lands mid-bucket doesn't read as a user edit.
export function isLayerStackDirty(current: LayerStack, preset: LayerStack): boolean {
  return (
    current.base !== preset.base ||
    current.route.treatment !== preset.route.treatment ||
    current.map.style !== preset.map.style ||
    layerToScrimStep(current.scrim) !== layerToScrimStep(preset.scrim)
  );
}

const MOSS = { r: 0x4a, g: 0x6b, b: 0x3a };
const SOLAR = { r: 0xe8, g: 0x5d, b: 0x2f };
const hex = (n: number) => n.toString(16).padStart(2, '0');

// Route pace-gradient scale: 0 = fastest segment (moss), 1 = slowest (solar).
export function paceToColor(norm: number): string {
  const t = Math.max(0, Math.min(1, norm));
  const r = Math.round(MOSS.r + (SOLAR.r - MOSS.r) * t);
  const g = Math.round(MOSS.g + (SOLAR.g - MOSS.g) * t);
  const b = Math.round(MOSS.b + (SOLAR.b - MOSS.b) * t);
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
