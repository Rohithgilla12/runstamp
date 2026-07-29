// expo-image-manipulator is dynamically imported inside extractPaletteFromPhoto for Vitest safety

export interface ExtractedPalette {
  dominant: string;       // Primary background/dominant hex color
  vibrant: string;        // Vibrant accent hex color for badges/stamps
  muted: string;          // Muted secondary hex color
  textOnDominant: string; // High contrast text color ('#ffffff' or '#14110d')
  accentDeep: string;     // Darkened variant of vibrant accent
  isDarkPhoto: boolean;   // True if photo tone is dark
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

// Convert RGB to HSL
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / delta + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / delta + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s, l };
}

// Convert HSL to RGB hex
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hue2rgb = (t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = Math.round(hue2rgb(hNorm + 1 / 3) * 255);
  const g = Math.round(hue2rgb(hNorm) * 255);
  const b = Math.round(hue2rgb(hNorm - 1 / 3) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Calculate relative luminance (W3C formula)
export function getLuminance({ r, g, b }: RGB): number {
  const a = [r, g, b].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Base64 to Uint8Array decoder for pure JS environments
export function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const placeHolders = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const arrayLen = (len * 3) / 4 - placeHolders;
  const bytes = new Uint8Array(arrayLen);

  let cur = 0;
  for (let i = 0; i < len; i += 4) {
    const b1 = lookup[clean.charCodeAt(i)];
    const b2 = lookup[clean.charCodeAt(i + 1)];
    const b3 = lookup[clean.charCodeAt(i + 2)];
    const b4 = lookup[clean.charCodeAt(i + 3)];

    bytes[cur++] = (b1 << 2) | (b2 >> 4);
    if (cur < arrayLen) bytes[cur++] = ((b2 & 15) << 4) | (b3 >> 2);
    if (cur < arrayLen) bytes[cur++] = ((b3 & 3) << 6) | (b4 & 63);
  }

  return bytes;
}

// Lightweight PNG IDAT / PLTE parser to extract raw pixel colors
export function parsePngColors(bytes: Uint8Array): RGB[] {
  const colors: RGB[] = [];
  if (bytes.length < 8) return colors;

  // Check PNG signature
  if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
    return colors;
  }

  let offset = 8;
  while (offset < bytes.length - 8) {
    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataOffset = offset + 8;

    if (type === 'PLTE') {
      // Palette chunk contains RGB triplets
      for (let i = 0; i < length; i += 3) {
        colors.push({
          r: bytes[dataOffset + i],
          g: bytes[dataOffset + i + 1],
          b: bytes[dataOffset + i + 2],
        });
      }
    } else if (type === 'IDAT') {
      // Raw byte sampling from IDAT stream for non-indexed PNGs
      const sampleStep = Math.max(1, Math.floor(length / 64));
      for (let i = 0; i < length - 3; i += sampleStep) {
        const r = bytes[dataOffset + i];
        const g = bytes[dataOffset + i + 1];
        const b = bytes[dataOffset + i + 2];
        // Filter out pure black / white boundary noise
        if (r + g + b > 15 && r + g + b < 750) {
          colors.push({ r, g, b });
        }
      }
    }

    offset += 12 + length;
  }

  return colors;
}

// Fallback palette when photo is not present or cannot be parsed
export const DEFAULT_PALETTE: ExtractedPalette = {
  dominant: '#14110d',
  vibrant: '#e85d2f',
  muted: '#75695a',
  textOnDominant: '#ffffff',
  accentDeep: '#c44a1e',
  isDarkPhoto: true,
};

// Select palette from a collection of RGB samples
export function analyzeColors(pixels: RGB[]): ExtractedPalette {
  if (!pixels.length) return DEFAULT_PALETTE;

  const colorScores = pixels.map((pixel) => {
    const hsl = rgbToHsl(pixel);
    const lum = getLuminance(pixel);
    return { pixel, hsl, lum };
  });

  // 1. Dominant color: average of all pixels
  const sum = pixels.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
  const dominantRgb: RGB = {
    r: Math.round(sum.r / pixels.length),
    g: Math.round(sum.g / pixels.length),
    b: Math.round(sum.b / pixels.length),
  };
  const dominantHex = rgbToHex(dominantRgb);
  const domLum = getLuminance(dominantRgb);
  const isDarkPhoto = domLum < 0.45;

  // 2. Vibrant color: highest saturation with balanced lightness
  const vibrantCandidates = [...colorScores].sort((a, b) => {
    const scoreA = a.hsl.s * (1 - Math.abs(a.hsl.l - 0.5));
    const scoreB = b.hsl.s * (1 - Math.abs(b.hsl.l - 0.5));
    return scoreB - scoreA;
  });

  const vibrantRgb = vibrantCandidates[0]?.pixel ?? { r: 232, g: 93, b: 47 };
  const vibrantHsl = rgbToHsl(vibrantRgb);
  const vibrantHex = rgbToHex(vibrantRgb);

  // 3. Muted color: moderate saturation, distinct from vibrant
  const mutedCandidates = [...colorScores].sort((a, b) => {
    const diffA = Math.abs(a.hsl.h - vibrantHsl.h);
    const scoreA = (1 - a.hsl.s) * (0.5 - Math.abs(a.hsl.l - 0.5));
    const diffB = Math.abs(b.hsl.h - vibrantHsl.h);
    const scoreB = (1 - b.hsl.s) * (0.5 - Math.abs(b.hsl.l - 0.5));
    return scoreB + diffB * 0.001 - (scoreA + diffA * 0.001);
  });
  const mutedHex = rgbToHex(mutedCandidates[0]?.pixel ?? { r: 117, g: 105, b: 90 });

  // 4. Contrast text & deep accent
  const textOnDominant = isDarkPhoto ? '#ffffff' : '#14110d';
  const accentDeep = hslToHex(vibrantHsl.h, vibrantHsl.s, Math.max(0.15, vibrantHsl.l - 0.2));

  return {
    dominant: dominantHex,
    vibrant: vibrantHex,
    muted: mutedHex,
    textOnDominant,
    accentDeep,
    isDarkPhoto,
  };
}

export async function extractPaletteFromPhoto(photoUri: string): Promise<ExtractedPalette> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 16, height: 16 } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!result.base64) return DEFAULT_PALETTE;

    const bytes = base64ToBytes(result.base64);
    const pixels = parsePngColors(bytes);
    return analyzeColors(pixels);
  } catch (err) {
    return DEFAULT_PALETTE;
  }
}
