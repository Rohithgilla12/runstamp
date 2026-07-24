import type { LayoutId, StickerSeed } from './types';

export interface LayoutMeta {
  id: LayoutId;
  name: string;
  seed?: StickerSeed[];
}

const postageSeed: StickerSeed[] = [
  { key: 'place',    x: 0.30, y: 0.10 },
  { key: 'distance', x: 0.50, y: 0.42, scale: 1.2 },
  { key: 'pace',     x: 0.30, y: 0.62 },
  { key: 'time',     x: 0.70, y: 0.62 },
  { key: 'date',     x: 0.82, y: 0.85 },
  { key: 'title',    x: 0.28, y: 0.85 },
];

const postmarkSeed: StickerSeed[] = [
  { key: 'distance', x: 0.5, y: 0.5, scale: 1.3 },
  { key: 'date',     x: 0.5, y: 0.74 },
  { key: 'place',    x: 0.5, y: 0.12 },
];

const boardingSeed: StickerSeed[] = [
  { key: 'place',    x: 0.5, y: 0.08 },
  { key: 'distance', x: 0.25, y: 0.30, scale: 1.2 },
  { key: 'time',     x: 0.75, y: 0.30 },
  { key: 'pace',     x: 0.25, y: 0.50 },
  { key: 'hr',       x: 0.75, y: 0.50 },
  { key: 'date',     x: 0.5, y: 0.72 },
];

const passportSeed: StickerSeed[] = [
  { key: 'place',    x: 0.30, y: 0.50 },
  { key: 'date',     x: 0.30, y: 0.58 },
  { key: 'distance', x: 0.70, y: 0.30 },
  { key: 'pace',     x: 0.70, y: 0.50 },
  { key: 'title',    x: 0.50, y: 0.85 },
];

const customsSeed: StickerSeed[] = [
  { key: 'place',    x: 0.25, y: 0.18 },
  { key: 'distance', x: 0.25, y: 0.36 },
  { key: 'pace',     x: 0.75, y: 0.36 },
  { key: 'time',     x: 0.25, y: 0.54 },
  { key: 'hr',       x: 0.75, y: 0.54 },
  { key: 'date',     x: 0.50, y: 0.80 },
];

const engravedSeed: StickerSeed[] = [
  { key: 'title',    x: 0.5, y: 0.30 },
  { key: 'distance', x: 0.5, y: 0.48, scale: 1.3 },
  { key: 'pace',     x: 0.35, y: 0.66 },
  { key: 'time',     x: 0.65, y: 0.66 },
  { key: 'date',     x: 0.5, y: 0.85 },
];

const waxSeed: StickerSeed[] = [
  { key: 'distance', x: 0.5, y: 0.30, scale: 1.3 },
  { key: 'title',    x: 0.5, y: 0.50 },
  { key: 'date',     x: 0.5, y: 0.80 },
];

const minimalSeed: StickerSeed[] = [
  { key: 'distance', x: 0.5, y: 0.42, scale: 1.2 },
  { key: 'pace',     x: 0.35, y: 0.62 },
  { key: 'time',     x: 0.65, y: 0.62 },
];

const datestampSeed: StickerSeed[] = [
  { key: 'date',     x: 0.65, y: 0.50, scale: 1.3 },
  { key: 'distance', x: 0.30, y: 0.28 },
  { key: 'pace',     x: 0.30, y: 0.45 },
  { key: 'time',     x: 0.30, y: 0.62 },
];

const halftoneSeed: StickerSeed[] = [
  { key: 'distance', x: 0.5, y: 0.30, scale: 1.4 },
  { key: 'pace',     x: 0.30, y: 0.55 },
  { key: 'time',     x: 0.70, y: 0.55 },
  { key: 'title',    x: 0.5, y: 0.80 },
];

const cyanotypeSeed: StickerSeed[] = [
  { key: 'place',    x: 0.5, y: 0.18 },
  { key: 'distance', x: 0.5, y: 0.45, scale: 1.2 },
  { key: 'date',     x: 0.5, y: 0.78 },
];

const risoSeed: StickerSeed[] = [
  { key: 'distance', x: 0.5, y: 0.30, scale: 1.4 },
  { key: 'pace',     x: 0.30, y: 0.55 },
  { key: 'time',     x: 0.70, y: 0.55 },
  { key: 'date',     x: 0.5, y: 0.82 },
];

const signatureSeed: StickerSeed[] = [
  { key: 'place',    x: 0.30, y: 0.66 },
  { key: 'distance', x: 0.30, y: 0.76, scale: 1.3 },
  { key: 'pace',     x: 0.22, y: 0.88 },
  { key: 'time',     x: 0.5,  y: 0.88 },
];

const passportWindowSeed: StickerSeed[] = [
  { key: 'place',    x: 0.30, y: 0.80 },
  { key: 'distance', x: 0.30, y: 0.88, scale: 1.2 },
];

const splitFieldSeed: StickerSeed[] = [
  { key: 'place',    x: 0.28, y: 0.40 },
  { key: 'distance', x: 0.28, y: 0.46, scale: 1.2 },
];

export const LAYOUT_META: LayoutMeta[] = [
  { id: 'none',      name: 'None' },
  { id: 'signature',       name: 'Signature',       seed: signatureSeed },
  { id: 'passport-window', name: 'Passport window', seed: passportWindowSeed },
  { id: 'split-field',     name: 'Split field',     seed: splitFieldSeed },
  { id: 'postage',   name: 'Postage',    seed: postageSeed },
  { id: 'postmark',  name: 'Postmark',   seed: postmarkSeed },
  { id: 'boarding',  name: 'Boarding',   seed: boardingSeed },
  { id: 'passport',  name: 'Passport',   seed: passportSeed },
  { id: 'customs',   name: 'Customs',    seed: customsSeed },
  { id: 'engraved',  name: 'Engraved',   seed: engravedSeed },
  { id: 'wax',       name: 'Wax seal',   seed: waxSeed },
  { id: 'minimal',   name: 'Minimal',    seed: minimalSeed },
  { id: 'datestamp', name: 'Date stamp', seed: datestampSeed },
  { id: 'halftone',  name: 'Halftone',   seed: halftoneSeed },
  { id: 'cyanotype', name: 'Cyanotype',  seed: cyanotypeSeed },
  { id: 'riso',      name: 'Riso',       seed: risoSeed },
];
