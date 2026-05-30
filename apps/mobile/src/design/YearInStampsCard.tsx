// YearInStampsCard
//
// 9:16 shareable summary of a year's running + stamps collection. Sized at
// 360 × 640 logical units (multiplied at the call site via `scale` for
// high-density video export — scale=3 lands at 1080×1920 native Stories
// output). Mirrors PeriodShareCard's pattern: off-screen render,
// capture-ref to PNG or to the video pipeline.
//
// Reveal animation (when progress is set):
//   0–25%   year title fades in + reveals
//   20–55%  tally numbers (km / runs / countries) tick up
//   45–95%  stamps appear staggered into a grid
//   85–100% final hold + footer mark settles
//
// Design follows .impeccable.md: cream paper, ink text, one solar pop
// (the year accent), real-world materials (postmark + perforation).

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import type { Activity } from '../data/models';
import type { CatalogStamp } from '../state/useStamps';
import { StampBadge } from './StampBadge';
import { useColors } from './theme';
import { RunstampMark } from './RunstampMark';
import { TText, Eyebrow } from './typography';
import { easeInOut, staggeredT } from './charts/reveal';
import { countContinents } from './worldGeometry';

export const YIS_CARD_WIDTH = 360;
export const YIS_CARD_HEIGHT = 640;

export interface YearStats {
  totalKm: number;
  totalRuns: number;
  totalSec: number;
  newCities: number;
  countries: number;
  continents: number;
  longestRunKm: number;
  longestRunDate: string | null;
}

interface Props {
  year: number;
  stats: YearStats;
  earnedThisYear: CatalogStamp[];
  units: 'km' | 'mi';
  /** 0..1 reveal progress. Undefined = static (full card). */
  progress?: number;
  /** Linear scale for every spatial dimension. Defaults to 1. */
  scale?: number;
}

export function YearInStampsCard({ year, stats, earnedThisYear, units, progress, scale = 1 }: Props) {
  const c = useColors();
  const s = scale;
  const revealing = progress !== undefined;

  const W = YIS_CARD_WIDTH * s;
  const H = YIS_CARD_HEIGHT * s;
  const PAD = 28 * s;

  // Three reveal phases, hand-tuned so a ~3-second video paces through
  // them legibly without dwell-time imbalance.
  const titleT = revealing ? easeInOut(clamp01(progress / 0.25)) : 1;
  const tallyT = revealing ? clamp01((progress - 0.2) / 0.35) : 1;
  const stampsT = revealing ? clamp01((progress - 0.45) / 0.5) : 1;
  const footerT = revealing ? clamp01((progress - 0.85) / 0.15) : 1;

  const distLabel = formatDist(stats.totalKm * (revealing ? tallyT : 1), units);
  const runsLabel = revealing ? String(Math.round(stats.totalRuns * tallyT)) : String(stats.totalRuns);
  const placesCount = stats.countries > 0 ? stats.countries : stats.newCities;
  const placesLabel = revealing
    ? String(Math.round(placesCount * tallyT))
    : String(placesCount);
  const distUnitLabel = units === 'mi' ? 'mi' : 'km';

  // Stamps shown in earned-at order, oldest first (matches the recap's
  // chronological narrative). Cap at 12 for visual density.
  const stamps = earnedThisYear
    .slice()
    .sort((a, b) => (a.earnedAt ?? '').localeCompare(b.earnedAt ?? ''))
    .slice(0, 12);

  return (
    <View style={{ width: W, height: H, backgroundColor: c.paper, padding: PAD, position: 'relative' }}>
      {/* Top motif row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Postmark year={year} scale={s} />
        <Eyebrow style={{ color: c.ink3, fontSize: 10 * s, letterSpacing: 1.4 * s }}>YEAR IN STAMPS</Eyebrow>
      </View>

      {/* Year title — the focal point. Fades in over the first quarter. */}
      <View style={{ marginTop: 36 * s, opacity: titleT }}>
        <Eyebrow style={{ color: c.accent, fontSize: 11 * s, letterSpacing: 1.6 * s }}>{stats.totalRuns > 0 ? 'STAMPED' : 'IDLE'}</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 * s }}>
          <TText
            variant="monoMedium"
            style={{ fontSize: 96 * s, lineHeight: 100 * s, letterSpacing: -3 * s, color: c.ink }}
          >
            {year}
          </TText>
        </View>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22 * s, color: c.ink2, marginTop: 2 * s, letterSpacing: -0.4 * s }}
        >
          {stats.totalRuns > 0 ? 'One year of running.' : 'A quiet year.'}
        </TText>
      </View>

      {/* Tally — the three numbers that matter. Distance is the only one
          with the solar pop, per "one warm pop per surface." */}
      <View style={{ marginTop: 32 * s, opacity: tallyT }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <TText
            variant="monoMedium"
            style={{ fontSize: 52 * s, lineHeight: 56 * s, letterSpacing: -1.6 * s, color: c.accent }}
          >
            {distLabel}
          </TText>
          <TText
            variant="serifItalic"
            style={{ fontSize: 22 * s, color: c.ink2, marginLeft: 8 * s }}
          >
            {distUnitLabel}
          </TText>
        </View>
        <View style={{ flexDirection: 'row', gap: 24 * s, marginTop: 14 * s }}>
          <Tally label="RUNS" value={runsLabel} scale={s} />
          <Tally label={stats.countries > 0 ? 'COUNTRIES' : 'CITIES'} value={placesLabel} scale={s} />
          <Tally label="LONGEST" value={`${formatDist(stats.longestRunKm * (revealing ? tallyT : 1), units)} ${distUnitLabel}`} scale={s} />
        </View>
      </View>

      {/* Perforation divider — the postal-perf motif from .impeccable.md. */}
      <View style={{ marginTop: 28 * s }}>
        <Perforation tint={c.ink} scale={s} />
      </View>

      {/* Stamps grid — staggered reveal across the back half. Empty state
          falls through to "no stamps yet" so the year is still complete. */}
      <View style={{ marginTop: 20 * s }}>
        <Eyebrow style={{ color: c.ink3, fontSize: 10 * s, letterSpacing: 1.4 * s, marginBottom: 12 * s }}>
          {stamps.length > 0 ? `${stamps.length} STAMPS EARNED` : 'NO STAMPS YET'}
        </Eyebrow>
        {stamps.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 * s }}>
            {stamps.map((stamp, i) => {
              const t = revealing ? staggeredT(stampsT, i, stamps.length) : 1;
              return (
                <View key={stamp.id} style={{ opacity: t, transform: [{ scale: 0.85 + 0.15 * t }] }}>
                  <StampBadge id={`yis-${stamp.id}`} name={stamp.name} tier={stamp.tier} earned size={56 * s} />
                </View>
              );
            })}
          </View>
        ) : (
          <TText style={{ fontSize: 13 * s, color: c.ink3, lineHeight: 18 * s }}>
            Connect a run source and the stamps catalogue starts marking the year.
          </TText>
        )}
      </View>

      {/* Footer lockup — quiet, ink, mono. Settles in at the end of the reveal. */}
      <View
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          bottom: PAD - 4 * s,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: footerT,
        }}
      >
        <RunstampMark tone="ink" opacity={0.55} />
        <TText variant="mono" style={{ fontSize: 10 * s, color: c.ink3, letterSpacing: 1.4 * s }}>
          RUNSTAMP · {year}
        </TText>
      </View>
    </View>
  );
}

function Tally({ label, value, scale: s }: { label: string; value: string; scale: number }) {
  const c = useColors();
  return (
    <View style={{ gap: 2 * s }}>
      <Eyebrow style={{ color: c.ink3, fontSize: 9 * s, letterSpacing: 1.2 * s }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 17 * s, color: c.ink, letterSpacing: -0.2 * s }}>
        {value}
      </TText>
    </View>
  );
}

// Postmark — same brand motif as PeriodShareCard. Centered year stamp
// reads "'24 / '25 / '26" depending on year.
function Postmark({ year, scale: s }: { year: number; scale: number }) {
  const c = useColors();
  const size = 44 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1 * s} stroke={c.ink} strokeWidth={1 * s} fill="none" opacity={0.7} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4 * s}
        stroke={c.ink}
        strokeWidth={0.5 * s}
        strokeDasharray={`${2 * s} ${2 * s}`}
        fill="none"
        opacity={0.55}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + 4 * s}
        textAnchor="middle"
        fontSize={11 * s}
        fontWeight="600"
        fill={c.ink}
        opacity={0.85}
      >
        {`'${String(year).slice(-2)}`}
      </SvgText>
      <Path d={`M${size / 2} ${4 * s} L${size / 2} ${10 * s}`} stroke={c.ink} strokeWidth={0.5 * s} opacity={0.5} />
      <Path d={`M${size / 2} ${size - 10 * s} L${size / 2} ${size - 4 * s}`} stroke={c.ink} strokeWidth={0.5 * s} opacity={0.5} />
    </Svg>
  );
}

function Perforation({ tint, scale: s }: { tint: string; scale: number }) {
  const dots = 32;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      {Array.from({ length: dots }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 2 * s,
            height: 2 * s,
            borderRadius: 1 * s,
            backgroundColor: tint,
            opacity: 0.2,
          }}
        />
      ))}
    </View>
  );
}

function formatDist(km: number, units: 'km' | 'mi'): string {
  const v = units === 'mi' ? km / 1.609 : km;
  if (v >= 1000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(0);
  return v.toFixed(1).replace(/\.0$/, '');
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// Helper exposed for callers that need the same shape as YearInStampsScreen.
export function computeYearStats(activities: Activity[], earned: CatalogStamp[], year: number): YearStats {
  const yearPrefix = `${year}-`;
  const yearRuns = activities.filter((a) => a.date.startsWith(yearPrefix));
  let totalKm = 0;
  let totalSec = 0;
  let longestRunKm = 0;
  let longestRunDate: string | null = null;
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const r of yearRuns) {
    totalKm += r.distance;
    totalSec += r.seconds;
    if (r.distance > longestRunKm) {
      longestRunKm = r.distance;
      longestRunDate = r.date;
    }
    if (r.city?.trim()) cities.add(r.city.trim());
    if (r.country?.trim()) countries.add(r.country.trim());
  }
  return {
    totalKm,
    totalRuns: yearRuns.length,
    totalSec,
    newCities: cities.size,
    countries: countries.size,
    continents: countContinents([...countries]),
    longestRunKm,
    longestRunDate,
  };
}

export function filterEarnedInYear(earned: CatalogStamp[], year: number): CatalogStamp[] {
  const prefix = `${year}-`;
  return earned.filter((s) => s.earnedAt?.startsWith(prefix));
}
