import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { StampTier } from '../data/sample';
import type { CatalogStamp } from '../state/useStamps';
import { TText } from './typography';
import { StampBadge } from './StampBadge';
import { hasIllustration, StampIllustration, type IllustrationColors } from './stampIllustrations';
import { PostmarkCancellation } from './PostmarkCancellation';

interface Props {
  stamp: CatalogStamp;
  activityCity?: string;
  activityDistanceKm?: number;
  activityTitle?: string;
  /** ISO-2 country code derived from the linked activity (e.g. "IN"). */
  countryISO?: string;
  width: number;
  height: number;
}

// Postage-stamp share artifact for a single earned stamp. The composition
// borrows from real philately: stamp paper inset from the outer canvas with
// scalloped perforated edges; top plate with the wordmark and country code;
// an illustration (when one is registered for this stamp) paired with a big
// serif-italic denomination; bottom plate with a postmark cancellation
// overlapping the bottom-left corner.
//
// Fall-back for stamps without an illustration: the existing StampBadge
// renders in the illustration slot so every earnable stamp ships a card.
export function StampShareCard({
  stamp,
  activityCity,
  activityDistanceKm,
  activityTitle,
  countryISO,
  width,
  height,
}: Props) {
  const palette = paletteForTier(stamp.tier, stamp.category);
  const denom = denominationFor(stamp, activityDistanceKm);
  const earnedAt = stamp.earnedAt ? new Date(stamp.earnedAt) : null;
  const yearStr = earnedAt ? earnedAt.getFullYear() : new Date().getFullYear();
  const country = countryISO?.toUpperCase() || 'WORLDWIDE';
  const showIll = hasIllustration(stamp.id);

  const marginH = width * 0.055;
  const marginV = height * 0.035;
  const paperW = width - marginH * 2;
  const paperH = height - marginV * 2;
  const pad = paperW * 0.07;
  const illSize = paperW * 0.46;
  const postmarkSize = paperW * 0.24;
  const titleFont = Math.min(paperW * 0.078, 36);
  const denomFont = Math.min(paperW * 0.22, 96);
  const eyebrowFont = Math.max(Math.min(paperW * 0.028, 13), 9);
  const monoSm = Math.max(Math.min(paperW * 0.026, 12), 8);

  const illColors: IllustrationColors = {
    ink: palette.ink,
    accent: palette.accent,
    shadow: palette.shadow,
    foil: palette.foil,
  };

  return (
    <View style={{ width, height, backgroundColor: palette.canvas, position: 'relative', overflow: 'hidden' }}>
      {/* Stamp paper rectangle */}
      <View
        style={{
          position: 'absolute',
          left: marginH,
          top: marginV,
          width: paperW,
          height: paperH,
          backgroundColor: palette.paper,
          paddingHorizontal: pad,
          paddingVertical: pad * 0.85,
        }}
      >
        {/* Top plate */}
        <View>
          <TText
            variant="mono"
            style={{
              fontSize: eyebrowFont,
              color: palette.ink,
              letterSpacing: 2.4,
              fontWeight: '600',
            }}
          >
            RUNSTAMP · {country} · {yearStr}
          </TText>
          <View style={{ height: 1, backgroundColor: palette.ink, opacity: 0.35, marginTop: pad * 0.5 }} />
        </View>

        {/* Body: illustration + denomination */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: pad * 0.4 }}>
          <View style={{ width: illSize, height: illSize, alignItems: 'center', justifyContent: 'center' }}>
            {showIll ? (
              <StampIllustration stampId={stamp.id} size={illSize} colors={illColors} />
            ) : (
              <StampBadge id={`share-${stamp.id}`} name={stamp.name} tier={stamp.tier} earned size={illSize * 0.86} />
            )}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: pad * 0.6 }}>
            <TText
              variant="serifItalic"
              style={{
                fontSize: denomFont,
                lineHeight: denomFont * 1.02,
                color: palette.ink,
                letterSpacing: -2,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {denom.big}
            </TText>
            <TText
              variant="mono"
              style={{
                fontSize: monoSm,
                color: palette.ink,
                letterSpacing: 2,
                fontWeight: '600',
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {denom.unit}
            </TText>
            {!!denom.secondary && (
              <TText
                variant="serifItalic"
                style={{
                  fontSize: titleFont * 0.6,
                  color: palette.ink,
                  opacity: 0.65,
                  marginTop: 6,
                  letterSpacing: -0.2,
                }}
                numberOfLines={2}
              >
                {denom.secondary}
              </TText>
            )}
          </View>
        </View>

        {/* Hairline above bottom plate */}
        <View style={{ height: 1, backgroundColor: palette.ink, opacity: 0.35 }} />

        {/* Bottom plate: name + date + footer.
            Postmark is rendered outside this paper view so it can overlap
            the bottom-left corner and bleed onto the canvas. */}
        <View style={{ paddingTop: pad * 0.5, paddingLeft: postmarkSize * 0.55 }}>
          <TText
            variant="serifItalic"
            style={{
              fontSize: titleFont,
              lineHeight: titleFont * 1.05,
              color: palette.ink,
              letterSpacing: -0.4,
            }}
            numberOfLines={2}
          >
            {stamp.name}
          </TText>
          <TText
            variant="mono"
            style={{ fontSize: monoSm, color: palette.ink, opacity: 0.6, marginTop: 4, letterSpacing: 1.2 }}
            numberOfLines={1}
          >
            {[earnedAt ? formatPostmarkDate(earnedAt) : '', activityCity?.toUpperCase()]
              .filter(Boolean)
              .join(' · ')}
          </TText>
          <TText
            variant="mono"
            style={{ fontSize: monoSm * 0.85, color: palette.ink, opacity: 0.42, marginTop: 4, letterSpacing: 1.6 }}
            numberOfLines={1}
          >
            STAMP · {stamp.id.toUpperCase()}
          </TText>
        </View>
      </View>

      {/* Perforations around the stamp paper edge */}
      <Perforations
        canvasColor={palette.canvas}
        canvasW={width}
        canvasH={height}
        marginH={marginH}
        marginV={marginV}
        paperW={paperW}
        paperH={paperH}
        radius={width * 0.014}
      />

      {/* Postmark cancellation — overlaps the bottom-left corner of the
          stamp paper, with ink-bleed splotches extending onto the canvas */}
      <View
        style={{
          position: 'absolute',
          left: marginH - postmarkSize * 0.32,
          top: marginV + paperH - postmarkSize * 0.65,
          width: postmarkSize,
          height: postmarkSize,
        }}
        pointerEvents="none"
      >
        <PostmarkCancellation
          size={postmarkSize}
          color={palette.postmarkInk}
          topText={earnedAt ? formatPostmarkDate(earnedAt) : ''}
          bottomText={activityCity || country}
        />
      </View>
    </View>
  );
}

// ── Perforations ─────────────────────────────────────────────────────────

function Perforations({
  canvasColor,
  canvasW,
  canvasH,
  marginH,
  marginV,
  paperW,
  paperH,
  radius,
}: {
  canvasColor: string;
  canvasW: number;
  canvasH: number;
  marginH: number;
  marginV: number;
  paperW: number;
  paperH: number;
  radius: number;
}) {
  const pitch = radius * 2.6;
  const colCount = Math.floor(paperW / pitch);
  const colSpacing = paperW / colCount;
  const rowCount = Math.floor(paperH / pitch);
  const rowSpacing = paperH / rowCount;

  const circles: Array<{ cx: number; cy: number }> = [];
  // Top + bottom edges
  for (let i = 0; i <= colCount; i++) {
    const cx = marginH + i * colSpacing;
    circles.push({ cx, cy: marginV });
    circles.push({ cx, cy: marginV + paperH });
  }
  // Left + right edges (skip corners — already covered above)
  for (let i = 1; i < rowCount; i++) {
    const cy = marginV + i * rowSpacing;
    circles.push({ cx: marginH, cy });
    circles.push({ cx: marginH + paperW, cy });
  }

  return (
    <Svg
      width={canvasW}
      height={canvasH}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {circles.map((c, i) => (
        <Circle key={i} cx={c.cx} cy={c.cy} r={radius} fill={canvasColor} />
      ))}
    </Svg>
  );
}

// ── Tier + category palette ──────────────────────────────────────────────

interface Palette {
  canvas: string;
  paper: string;
  ink: string;
  postmarkInk: string;
  accent?: string;
  shadow?: string;
  foil?: string;
}

function paletteForTier(tier: StampTier, category: string): Palette {
  if (tier === 'mythic') {
    return {
      canvas: '#1a1612',
      paper: '#f3e0a8',
      ink: '#14110d',
      postmarkInk: '#14110d',
      accent: '#e85d2f',
      shadow: '#7a5530',
      foil: '#e85d2f',
    };
  }
  if (tier === 'rare') {
    return {
      canvas: '#14110d',
      paper: '#f3ede2',
      ink: '#14110d',
      postmarkInk: '#e85d2f',
      accent: '#e85d2f',
    };
  }
  // Common — per-category canvas, cream paper, ink everything
  return {
    canvas: commonCanvasFor(category),
    paper: '#ebe3d3',
    ink: '#14110d',
    postmarkInk: '#14110d',
  };
}

function commonCanvasFor(category: string): string {
  if (category === 'pace') return '#3c6e8c';      // sky
  if (category === 'place') return '#5a3a4a';     // aubergine
  if (category === 'streak') return '#c0833a';    // warn (amber)
  if (category === 'event') return '#4a6b3a';     // moss (events default to the family base)
  return '#4a6b3a';                                // distance / milestone → moss
}

// ── Denomination map ─────────────────────────────────────────────────────

interface Denomination {
  big: string;
  unit: string;
  secondary?: string;
}

function denominationFor(stamp: CatalogStamp, activityDistanceKm?: number): Denomination {
  switch (stamp.id) {
    case 'first_5k':           return { big: '5',         unit: 'KM',             secondary: 'First 5K' };
    case 'first_10k':          return { big: '10',        unit: 'KM',             secondary: 'First 10K' };
    case 'first_half':         return { big: '21.1',      unit: 'KM',             secondary: 'First half' };
    case 'first_marathon':     return { big: '42.2',      unit: 'KM',             secondary: 'First marathon' };
    case 'lifetime_100km':     return { big: '100',       unit: 'KM · LIFETIME' };
    case 'lifetime_500km':     return { big: '500',       unit: 'KM · LIFETIME' };
    case 'lifetime_1000km':    return { big: '1,000',     unit: 'KM · LIFETIME' };
    case 'sub_50_10k':         return { big: 'sub-50',    unit: '10K' };
    case 'sub_2h_half':        return { big: 'sub-2:00',  unit: 'HALF MARATHON' };
    case 'sub_4_marathon':     return { big: 'sub-4:00',  unit: 'MARATHON' };
    case 'sub_345_marathon':   return { big: 'sub-3:45',  unit: 'MARATHON' };
    case 'sub_3h_marathon':    return { big: 'sub-3:00',  unit: 'MARATHON' };
    case 'boston_q':           return { big: 'BQ',        unit: 'MARATHON',        secondary: 'Boston qualifier' };
    case 'ultra_50k':          return { big: '50',        unit: 'KM · ULTRA' };
    case 'cities_5':           return { big: '5',         unit: 'CITIES' };
    case 'countries_3':        return { big: '3',         unit: 'COUNTRIES' };
    // India set
    case 'tata_mumbai_marathon':  return { big: '42.2', unit: 'KM',  secondary: 'Mumbai Marathon' };
    case 'hyderabad_marathon':    return { big: '42.2', unit: 'KM',  secondary: 'Hyderabad Marathon' };
    case 'bengaluru_marathon':    return { big: '42.2', unit: 'KM',  secondary: 'Bengaluru Marathon' };
    case 'vedanta_delhi_half':    return { big: '21.1', unit: 'KM',  secondary: 'Delhi Half Marathon' };
    case 'ladakh_marathon':       return { big: '42.2', unit: 'KM',  secondary: 'Ladakh · 3,500m' };
    case 'monsoon_run':           return { big: '15+',  unit: 'KM',  secondary: 'Monsoon long run' };
    default: {
      // Generic fallback: try to surface activity distance if linked.
      if (activityDistanceKm && activityDistanceKm > 0) {
        return { big: activityDistanceKm.toFixed(1), unit: 'KM', secondary: stamp.name };
      }
      return { big: stamp.name, unit: '' };
    }
  }
}

// "16 MAY" / "16 MAY 2026" — wraps onto a single line of the postmark arc.
function formatPostmarkDate(d: Date): string {
  const day = d.getDate();
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
  return `${day} ${month} ${d.getFullYear()}`;
}
