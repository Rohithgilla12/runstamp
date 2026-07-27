import { describe, expect, it } from 'vitest';
import {
  signaturePreset, passportWindowPreset, splitFieldPreset,
  frameSpecToLayers, paceToColor, LAYER_PRESETS, SPLIT_TOP_FRACTION,
  scrimStepToLayer, layerToScrimStep, isLayerStackDirty,
  type ScrimStep, type ScrimMode,
} from '../layers';
import { FRAMES } from '../layouts/frames';
import { LAYOUT_META } from '../layouts/registry.data';

describe('presets', () => {
  it('signature = photo full / map off / route signature / bottom scrim', () => {
    const s = signaturePreset();
    expect(s.photo.enabled).toBe(true);
    expect(s.photo.placement).toBe('full');
    expect(s.map.enabled).toBe(false);
    expect(s.route.enabled).toBe(true);
    expect(s.route.treatment).toBe('signature');
    expect(s.scrim.mode).toBe('bottom');
  });

  it('passport window = photo inset / map on', () => {
    const s = passportWindowPreset();
    expect(s.photo.placement).toBe('inset');
    expect(s.map.enabled).toBe(true);
    expect(s.route.enabled).toBe(true);
  });

  it('split field = photo region-top / map on', () => {
    const s = splitFieldPreset();
    expect(s.photo.placement).toBe('region-top');
    expect(s.map.enabled).toBe(true);
    expect(SPLIT_TOP_FRACTION).toBeGreaterThan(0);
    expect(SPLIT_TOP_FRACTION).toBeLessThan(1);
  });
});

describe('frameSpecToLayers', () => {
  it('maps a map-style frame to map-on / route-on / photo-off', () => {
    const s = frameSpecToLayers(FRAMES.postage);
    expect(s.map.enabled).toBe(true);
    expect(s.map.opacity).toBe(FRAMES.postage!.mapOpacity);
    expect(s.map.style).toBe(FRAMES.postage!.mapStyle);
    expect(s.route.enabled).toBe(true);
    expect(s.photo.enabled).toBe(false);
  });

  it('undefined frame (the "none" layout) => full-bleed map + route, no scrim', () => {
    const s = frameSpecToLayers(undefined);
    expect(s.map.enabled).toBe(true);
    expect(s.scrim.mode).toBe('none');
  });

  it('existing templates carry no layer scrim (their frame overlay handles it)', () => {
    expect(frameSpecToLayers(FRAMES.postmark).scrim.mode).toBe('none');
    expect(frameSpecToLayers(FRAMES.passport).scrim.mode).toBe('none');
  });
});

describe('LAYER_PRESETS', () => {
  it('has an entry for every current layout id', () => {
    for (const m of LAYOUT_META) expect(LAYER_PRESETS[m.id]).toBeTruthy();
  });
});

describe('scrim steps', () => {
  const DIRECTIONS: ScrimMode[] = ['top', 'bottom', 'full'];
  const STEPS: ScrimStep[] = ['none', 'soft', 'medium', 'strong'];

  it('round-trips every step across every direction', () => {
    for (const dir of DIRECTIONS) {
      for (const step of STEPS) {
        expect(layerToScrimStep(scrimStepToLayer(step, dir))).toBe(step);
      }
    }
  });

  it('preserves the preset direction for the three on-steps', () => {
    for (const dir of DIRECTIONS) {
      for (const step of ['soft', 'medium', 'strong'] as const) {
        expect(scrimStepToLayer(step, dir).mode).toBe(dir);
      }
    }
  });

  it('none zeroes the strength and turns the mode off', () => {
    for (const dir of DIRECTIONS) {
      expect(scrimStepToLayer('none', dir)).toEqual({ mode: 'none', strength: 0 });
    }
  });

  it('an on-step applied to a none preset falls back to bottom', () => {
    for (const step of ['soft', 'medium', 'strong'] as const) {
      expect(scrimStepToLayer(step, 'none').mode).toBe('bottom');
    }
  });

  it('strength increases monotonically across the on-steps', () => {
    const soft = scrimStepToLayer('soft', 'bottom').strength;
    const medium = scrimStepToLayer('medium', 'bottom').strength;
    const strong = scrimStepToLayer('strong', 'bottom').strength;
    expect(soft).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(soft);
    expect(strong).toBeGreaterThan(medium);
  });

  it('reads mode none as the none step whatever the leftover strength', () => {
    expect(layerToScrimStep({ mode: 'none', strength: 0.9 })).toBe('none');
  });

  it('reads a zero strength as the none step whatever the mode', () => {
    expect(layerToScrimStep({ mode: 'bottom', strength: 0 })).toBe('none');
  });

  it('buckets arbitrary preset strengths', () => {
    expect(layerToScrimStep({ mode: 'bottom', strength: 0.35 })).toBe('soft');
    expect(layerToScrimStep({ mode: 'bottom', strength: 0.7 })).toBe('medium');
    expect(layerToScrimStep({ mode: 'bottom', strength: 0.85 })).toBe('strong');
  });
});

describe('isLayerStackDirty', () => {
  it('is false for every preset compared against itself', () => {
    for (const m of LAYOUT_META) {
      const preset = LAYER_PRESETS[m.id];
      expect(isLayerStackDirty(preset, preset)).toBe(false);
    }
  });

  it('is false for a structurally equal copy', () => {
    const preset = signaturePreset();
    expect(isLayerStackDirty(signaturePreset(), preset)).toBe(false);
  });

  it('flags each of the four user-editable fields', () => {
    const preset = signaturePreset();
    expect(isLayerStackDirty({ ...preset, base: 'paper' }, preset)).toBe(true);
    expect(isLayerStackDirty(
      { ...preset, route: { ...preset.route, treatment: 'plain' } }, preset)).toBe(true);
    expect(isLayerStackDirty(
      { ...preset, scrim: { mode: 'none', strength: 0 } }, preset)).toBe(true);
    expect(isLayerStackDirty(
      { ...preset, map: { ...preset.map, style: 'light' } }, preset)).toBe(true);
  });

  it('ignores fields the shelf cannot edit', () => {
    const preset = signaturePreset();
    expect(isLayerStackDirty(
      { ...preset, route: { ...preset.route, strokeScale: 2 } }, preset)).toBe(false);
    expect(isLayerStackDirty(
      { ...preset, photo: { ...preset.photo, placement: 'inset' } }, preset)).toBe(false);
    expect(isLayerStackDirty(
      { ...preset, map: { ...preset.map, opacity: 0.3 } }, preset)).toBe(false);
  });

  it('treats a scrim strength change within the same step as clean', () => {
    const preset = signaturePreset();
    const sameStep = { ...preset, scrim: { ...preset.scrim, strength: 0.88 } };
    expect(layerToScrimStep(sameStep.scrim)).toBe(layerToScrimStep(preset.scrim));
    expect(isLayerStackDirty(sameStep, preset)).toBe(false);
  });
});

describe('paceToColor', () => {
  it('fast end is moss, slow end is solar', () => {
    expect(paceToColor(0).toLowerCase()).toBe('#4a6b3a');
    expect(paceToColor(1).toLowerCase()).toBe('#e85d2f');
  });
  it('clamps out-of-range input', () => {
    expect(paceToColor(-5)).toBe(paceToColor(0));
    expect(paceToColor(5)).toBe(paceToColor(1));
  });
  it('midpoint is a blend between the two endpoints', () => {
    const mid = paceToColor(0.5);
    expect(mid).toMatch(/^#[0-9a-f]{6}$/i);
    expect(mid).not.toBe(paceToColor(0));
    expect(mid).not.toBe(paceToColor(1));
  });
});
