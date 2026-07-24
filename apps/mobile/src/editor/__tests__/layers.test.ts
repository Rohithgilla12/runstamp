import { describe, expect, it } from 'vitest';
import {
  signaturePreset, passportWindowPreset, splitFieldPreset,
  frameSpecToLayers, paceToColor, LAYER_PRESETS, SPLIT_TOP_FRACTION,
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

  it('a transparent-scrim frame yields scrim none; a real scrim yields bottom', () => {
    expect(frameSpecToLayers(FRAMES.passport).scrim.mode).toBe('none');
    expect(frameSpecToLayers(FRAMES.postmark).scrim.mode).toBe('bottom');
  });
});

describe('LAYER_PRESETS', () => {
  it('has an entry for every current layout id', () => {
    for (const m of LAYOUT_META) expect(LAYER_PRESETS[m.id]).toBeTruthy();
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
