import type { LayoutId, StickerTheme } from './types';

const PAPER = '#f3ede2';
const INK = '#14110d';
const SOLAR = '#e85d2f';

// none = no overrides — sticker defaults render as-is.
const noneTheme: StickerTheme = {};

const postageTheme: StickerTheme = {
  container: { backgroundColor: PAPER, borderColor: SOLAR, borderWidth: 1, borderRadius: 4 },
  text: { color: INK, fontFamily: 'monoSemi', letterSpacing: 0.5, textTransform: 'uppercase' },
  eyebrow: { color: 'rgba(20,17,13,0.55)' },
};

const postmarkTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: PAPER, fontFamily: 'serifItalic', letterSpacing: -0.2 },
  eyebrow: { color: 'rgba(243,237,226,0.6)' },
};

const boardingTheme: StickerTheme = {
  container: { backgroundColor: 'rgba(20,17,13,0.7)', borderColor: 'rgba(243,237,226,0.35)', borderRadius: 2 },
  text: { color: PAPER, fontFamily: 'monoMedium', textTransform: 'uppercase', letterSpacing: 1 },
  eyebrow: { color: 'rgba(243,237,226,0.55)' },
};

const passportTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: INK, fontFamily: 'serifItalic' },
  eyebrow: { color: SOLAR, letterSpacing: 1.4 },
};

const customsTheme: StickerTheme = {
  container: { backgroundColor: 'rgba(243,237,226,0.92)', borderColor: 'rgba(20,17,13,0.6)', borderWidth: 1, borderRadius: 0 },
  text: { color: INK, fontFamily: 'monoMedium', textTransform: 'uppercase', letterSpacing: 0.6 },
  eyebrow: { color: SOLAR, letterSpacing: 1.6 },
};

const engravedTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: INK, fontFamily: 'serif', letterSpacing: -0.3 },
  eyebrow: { color: 'rgba(20,17,13,0.5)' },
};

const waxTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: PAPER, fontFamily: 'serifItalic' },
  eyebrow: { color: SOLAR },
};

const minimalTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderColor: 'rgba(20,17,13,0.18)', borderWidth: 1, borderRadius: 6 },
  text: { color: INK, fontFamily: 'medium' },
  eyebrow: { color: 'rgba(20,17,13,0.5)' },
};

const datestampTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: INK, fontFamily: 'monoMedium', letterSpacing: 1 },
  eyebrow: { color: SOLAR, letterSpacing: 1.4 },
};

const halftoneTheme: StickerTheme = {
  container: { backgroundColor: PAPER, borderColor: INK, borderWidth: 1.5, borderRadius: 0 },
  text: { color: INK, fontFamily: 'semibold', textTransform: 'uppercase', letterSpacing: 1 },
  eyebrow: { color: 'rgba(20,17,13,0.6)' },
};

const cyanotypeTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: '#e8f1f7', fontFamily: 'serifItalic' },
  eyebrow: { color: 'rgba(232,241,247,0.7)' },
};

const risoTheme: StickerTheme = {
  container: { backgroundColor: PAPER, borderWidth: 0, borderRadius: 4 },
  text: { color: INK, fontFamily: 'semibold', textTransform: 'uppercase', letterSpacing: 1.2 },
  eyebrow: { color: SOLAR },
};

const signatureTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: PAPER, fontFamily: 'monoSemi', letterSpacing: -0.5 },
  eyebrow: { color: 'rgba(243,237,226,0.7)', letterSpacing: 1.4 },
};

const passportWindowTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: INK, fontFamily: 'monoSemi', letterSpacing: -0.5 },
  eyebrow: { color: SOLAR, letterSpacing: 1.4 },
};

const splitFieldTheme: StickerTheme = {
  container: { backgroundColor: 'transparent', borderWidth: 0 },
  text: { color: PAPER, fontFamily: 'monoSemi', letterSpacing: -0.5 },
  eyebrow: { color: 'rgba(243,237,226,0.7)', letterSpacing: 1.4 },
};

export const THEMES: Record<LayoutId, StickerTheme> = {
  none: noneTheme,
  signature: signatureTheme,
  'passport-window': passportWindowTheme,
  'split-field': splitFieldTheme,
  postage: postageTheme,
  postmark: postmarkTheme,
  boarding: boardingTheme,
  passport: passportTheme,
  customs: customsTheme,
  engraved: engravedTheme,
  wax: waxTheme,
  minimal: minimalTheme,
  datestamp: datestampTheme,
  halftone: halftoneTheme,
  cyanotype: cyanotypeTheme,
  riso: risoTheme,
};
