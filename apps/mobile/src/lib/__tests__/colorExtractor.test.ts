import { describe, expect, it } from 'vitest';
import {
  rgbToHsl,
  hslToHex,
  rgbToHex,
  getLuminance,
  base64ToBytes,
  analyzeColors,
  DEFAULT_PALETTE,
  type RGB,
} from '../colorExtractor';

describe('colorExtractor', () => {
  it('converts RGB to HSL correctly', () => {
    const red: RGB = { r: 255, g: 0, b: 0 };
    const hsl = rgbToHsl(red);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(1);
    expect(hsl.l).toBe(0.5);
  });

  it('converts HSL to Hex correctly', () => {
    const hex = hslToHex(0, 1, 0.5);
    expect(hex.toLowerCase()).toBe('#ff0000');
  });

  it('converts RGB to Hex correctly', () => {
    const hex = rgbToHex({ r: 232, g: 93, b: 47 });
    expect(hex.toLowerCase()).toBe('#e85d2f');
  });

  it('calculates relative luminance', () => {
    const whiteLum = getLuminance({ r: 255, g: 255, b: 255 });
    const blackLum = getLuminance({ r: 0, g: 0, b: 0 });
    expect(whiteLum).toBeCloseTo(1, 2);
    expect(blackLum).toBeCloseTo(0, 2);
  });

  it('decodes base64 to Uint8Array', () => {
    const base64 = 'SGVsbG8='; // "Hello"
    const bytes = base64ToBytes(base64);
    const decodedStr = String.fromCharCode(...Array.from(bytes));
    expect(decodedStr).toBe('Hello');
  });

  it('analyzes pixel collection into ExtractedPalette', () => {
    const pixels: RGB[] = [
      { r: 20, g: 30, b: 40 },
      { r: 230, g: 80, b: 20 },
      { r: 30, g: 40, b: 50 },
      { r: 100, g: 110, b: 120 },
    ];
    const palette = analyzeColors(pixels);
    expect(palette.dominant).toBeDefined();
    expect(palette.vibrant).toBeDefined();
    expect(palette.muted).toBeDefined();
    expect(palette.textOnDominant).toBe('#ffffff');
    expect(palette.isDarkPhoto).toBe(true);
  });

  it('returns default palette when empty pixels given', () => {
    const palette = analyzeColors([]);
    expect(palette).toEqual(DEFAULT_PALETTE);
  });
});
