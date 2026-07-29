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

const polaroidSeed: StickerSeed[] = [
  { key: 'title',    x: 0.50, y: 0.665 },
  { key: 'distance', x: 0.26, y: 0.765, scale: 1.1 },
  { key: 'pace',     x: 0.56, y: 0.765 },
  { key: 'time',     x: 0.83, y: 0.765 },
  { key: 'date',     x: 0.50, y: 0.875 },
];

const postcardSeed: StickerSeed[] = [
  { key: 'place',    x: 0.28, y: 0.60 },
  { key: 'distance', x: 0.28, y: 0.695, scale: 1.25 },
  { key: 'pace',     x: 0.22, y: 0.825 },
  { key: 'time',     x: 0.48, y: 0.825 },
  { key: 'date',     x: 0.80, y: 0.76 },
];

const ticketSeed: StickerSeed[] = [
  { key: 'distance', x: 0.22, y: 0.845, scale: 1.15 },
  { key: 'pace',     x: 0.55, y: 0.845 },
  { key: 'time',     x: 0.80, y: 0.845 },
  { key: 'place',    x: 0.26, y: 0.945 },
  { key: 'date',     x: 0.74, y: 0.945 },
];

const filmSeed: StickerSeed[] = [
  { key: 'place',    x: 0.50, y: 0.10 },
  { key: 'distance', x: 0.50, y: 0.70, scale: 1.35 },
  { key: 'pace',     x: 0.34, y: 0.83 },
  { key: 'time',     x: 0.66, y: 0.83 },
  { key: 'date',     x: 0.50, y: 0.915 },
];

const airmailSeed: StickerSeed[] = [
  { key: 'date',     x: 0.74, y: 0.12 },
  { key: 'place',    x: 0.32, y: 0.64 },
  { key: 'distance', x: 0.33, y: 0.73, scale: 1.3 },
  { key: 'pace',     x: 0.26, y: 0.87 },
  { key: 'time',     x: 0.54, y: 0.87 },
];

const journalSeed: StickerSeed[] = [
  { key: 'date',     x: 0.75, y: 0.575 },
  { key: 'distance', x: 0.34, y: 0.655, scale: 1.2 },
  { key: 'pace',     x: 0.28, y: 0.77 },
  { key: 'time',     x: 0.56, y: 0.77 },
  { key: 'place',    x: 0.32, y: 0.89 },
];

const exhibitSeed: StickerSeed[] = [
  { key: 'title',    x: 0.50, y: 0.70 },
  { key: 'distance', x: 0.30, y: 0.795, scale: 1.1 },
  { key: 'pace',     x: 0.58, y: 0.795 },
  { key: 'time',     x: 0.79, y: 0.795 },
  { key: 'date',     x: 0.50, y: 0.885 },
];

const bibSeed: StickerSeed[] = [
  { key: 'place',    x: 0.28, y: 0.665 },
  { key: 'date',     x: 0.72, y: 0.665 },
  { key: 'distance', x: 0.50, y: 0.765, scale: 1.6 },
  { key: 'pace',     x: 0.25, y: 0.895 },
  { key: 'time',     x: 0.50, y: 0.895 },
  { key: 'hr',       x: 0.75, y: 0.895 },
];

const tagSeed: StickerSeed[] = [
  { key: 'place',    x: 0.34, y: 0.745 },
  { key: 'distance', x: 0.36, y: 0.825, scale: 1.15 },
  { key: 'pace',     x: 0.28, y: 0.905 },
  { key: 'time',     x: 0.54, y: 0.905 },
];

const posterSeed: StickerSeed[] = [
  { key: 'date',     x: 0.50, y: 0.08 },
  { key: 'place',    x: 0.50, y: 0.60 },
  { key: 'distance', x: 0.50, y: 0.75, scale: 2.0 },
  { key: 'pace',     x: 0.34, y: 0.90 },
  { key: 'time',     x: 0.66, y: 0.90 },
];

const silhouetteSeed: StickerSeed[] = [
  { key: 'place',    x: 0.50, y: 0.10 },
  { key: 'distance', x: 0.50, y: 0.70, scale: 1.7 },
  { key: 'pace',     x: 0.30, y: 0.86 },
  { key: 'time',     x: 0.50, y: 0.86 },
  { key: 'date',     x: 0.72, y: 0.86 },
];

const vellumSeed: StickerSeed[] = [
  { key: 'place',    x: 0.30, y: 0.64 },
  { key: 'distance', x: 0.32, y: 0.74, scale: 1.35 },
  { key: 'pace',     x: 0.26, y: 0.86 },
  { key: 'time',     x: 0.52, y: 0.86 },
  { key: 'date',     x: 0.78, y: 0.86 },
];

const medalSeed: StickerSeed[] = [
  { key: 'distance', x: 0.50, y: 0.38, scale: 1.45 },
  { key: 'place',    x: 0.50, y: 0.78 },
  { key: 'pace',     x: 0.28, y: 0.88 },
  { key: 'time',     x: 0.52, y: 0.88 },
  { key: 'date',     x: 0.76, y: 0.88 },
];

const ribbonSeed: StickerSeed[] = [
  { key: 'place',    x: 0.50, y: 0.655 },
  { key: 'distance', x: 0.50, y: 0.715, scale: 1.35 },
  { key: 'pace',     x: 0.28, y: 0.80 },
  { key: 'time',     x: 0.52, y: 0.80 },
  { key: 'date',     x: 0.76, y: 0.80 },
];

const almanacSeed: StickerSeed[] = [
  { key: 'date',     x: 0.36, y: 0.60, scale: 1.2 },
  { key: 'distance', x: 0.36, y: 0.70, scale: 1.25 },
  { key: 'pace',     x: 0.30, y: 0.82 },
  { key: 'time',     x: 0.58, y: 0.82 },
  { key: 'place',    x: 0.36, y: 0.92 },
];

export const LAYOUT_META: LayoutMeta[] = [
  { id: 'none',      name: 'None' },
  { id: 'signature',       name: 'Signature',       seed: signatureSeed },
  { id: 'passport-window', name: 'Passport window', seed: passportWindowSeed },
  { id: 'split-field',     name: 'Split field',     seed: splitFieldSeed },
  { id: 'polaroid',  name: 'Polaroid',   seed: polaroidSeed },
  { id: 'postcard',  name: 'Postcard',   seed: postcardSeed },
  { id: 'ticket',    name: 'Ticket',     seed: ticketSeed },
  { id: 'film',      name: 'Film',       seed: filmSeed },
  { id: 'airmail',   name: 'Airmail',    seed: airmailSeed },
  { id: 'poster',    name: 'Poster',     seed: posterSeed },
  { id: 'bib',       name: 'Bib',        seed: bibSeed },
  { id: 'tag',       name: 'Tag',        seed: tagSeed },
  { id: 'journal',   name: 'Journal',    seed: journalSeed },
  { id: 'exhibit',   name: 'Exhibit',    seed: exhibitSeed },
  { id: 'silhouette', name: 'Silhouette', seed: silhouetteSeed },
  { id: 'vellum',     name: 'Vellum',     seed: vellumSeed },
  { id: 'medal',      name: 'Medal',      seed: medalSeed },
  { id: 'ribbon',     name: 'Ribbon',     seed: ribbonSeed },
  { id: 'almanac',    name: 'Almanac',    seed: almanacSeed },
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
