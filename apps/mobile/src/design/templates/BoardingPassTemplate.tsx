import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, type Units } from './shared';
import { richMetrics } from './metrics';
import { PhotoBackground } from './PhotoBackground';
import { RunstampMark } from '../RunstampMark';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
}

// Seeded LCG — deterministic, no Math.random() in render paths.
// Returns a sequence of pseudo-random floats in [0, 1) given a seed.
function seededSequence(seed: number, count: number): number[] {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  const values: number[] = [];
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    s = (a * s + c) % m;
    values.push(s / m);
  }
  return values;
}

// BoardingPassTemplate
//
// Airline boarding-pass layout from PRD §6.3.
// Two-column structure separated by a vertical perforated tear line (column of
// small circles). Left column holds ORIGIN → DESTINATION with city/country.
// Right "stub" column shows distance, pace, time stacked. A fake barcode strip
// sits at the bottom. Airmail red/blue diagonal stripe bands at top and bottom.
export function BoardingPassTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng }: Props) {
  const c = useColors();

  const stripH = 18;
  const barcodeH = 44;
  const contentH = height - stripH * 2 - barcodeH;

  // Fourth stub stat is data-aware: surface the richest metric the run carries
  // (GAP / cadence / VO₂ …) for the training-literate runner, falling back to
  // elevation so an indoor / unimported run never shows an empty slot.
  const topMetric = richMetrics(run, units).find((m) => m.key !== 'elev');
  const stubExtra =
    topMetric ?? { label: 'ELEVATION', value: `${run.elev}`, unit: 'm' };
  const stubExtraUnit = 'unit' in stubExtra ? stubExtra.unit : undefined;

  // Column widths — left body gets ~62%, right stub gets ~38%
  const tearX = Math.round(width * 0.62);
  const leftW = tearX;
  const rightW = width - tearX;

  return (
    <View style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: '#f3ede2' }}>

      {/* Paper texture — very subtle warm cream base */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#f0e9d8' }} />

      {/* Backdrop map / photo / solid bleeds under the content at low opacity */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
          <RouteMap points={run.route} rawLatLng={rawLatLng} width={width} height={height} style="light" accent={c.accent} routeStrokeWidth={2} animate={false} flat />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.55}
          fallback={
            <View style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 28 - 60, left: -20, width: width + 40,
                  height: 10, backgroundColor: 'rgba(20,17,13,0.03)', transform: [{ rotate: '-12deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.08 }} />
      )}

      {/* Top airmail stripe band */}
      <AirmailStripe width={width} height={stripH} position="top" />

      {/* Main content area */}
      <View style={{ position: 'absolute', top: stripH, left: 0, right: 0, height: contentH, flexDirection: 'row' }}>

        {/* LEFT COLUMN — boarding info */}
        <View style={{ width: leftW, paddingHorizontal: 18, paddingVertical: 16, justifyContent: 'space-between' }}>

          {/* Header row */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <TText variant="mono" style={{ fontSize: 9, color: c.ink3, letterSpacing: 2 }}>BOARDING PASS</TText>
              <View style={{ backgroundColor: c.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                <TText variant="mono" style={{ fontSize: 8, color: '#f3ede2', letterSpacing: 1 }}>
                  {run.kind.toUpperCase()}
                </TText>
              </View>
            </View>

            {/* Route line separator */}
            <View style={{ height: 0.8, backgroundColor: 'rgba(20,17,13,0.15)', marginBottom: 14 }} />

            {/* ORIGIN */}
            <View style={{ marginBottom: 6 }}>
              <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>FROM</Eyebrow>
              <TText variant="mono" style={{ fontSize: 22, color: c.ink, letterSpacing: -1, lineHeight: 26, marginTop: 1 }}>
                {cityCode(run.city)}
              </TText>
              <TText style={{ fontSize: 11, color: c.ink2, marginTop: 1 }}>{run.city}</TText>
              <TText variant="mono" style={{ fontSize: 9, color: c.ink3, marginTop: 1 }}>{run.country.toUpperCase()}</TText>
            </View>

            {/* Arrow connector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 }}>
              <View style={{ flex: 1, height: 0.8, backgroundColor: 'rgba(20,17,13,0.2)' }} />
              <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>→</TText>
              <View style={{ flex: 1, height: 0.8, backgroundColor: 'rgba(20,17,13,0.2)' }} />
            </View>

            {/* DESTINATION — same city, running is a circular journey */}
            <View>
              <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>TO</Eyebrow>
              <TText variant="mono" style={{ fontSize: 22, color: c.accent, letterSpacing: -1, lineHeight: 26, marginTop: 1 }}>
                {cityCode(run.city)}
              </TText>
              <TText style={{ fontSize: 11, color: c.ink2, marginTop: 1 }}>{run.city}</TText>
              <TText variant="mono" style={{ fontSize: 9, color: c.ink3, marginTop: 1 }}>{run.country.toUpperCase()}</TText>
            </View>
          </View>

          {/* Bottom flight info row */}
          <View>
            <View style={{ height: 0.8, backgroundColor: 'rgba(20,17,13,0.15)', marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View>
                <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>DATE</Eyebrow>
                <TText variant="mono" style={{ fontSize: 11, color: c.ink, marginTop: 1 }}>
                  {formatBoardingDate(run.date)}
                </TText>
              </View>
              <View>
                <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>GATE</Eyebrow>
                <TText variant="mono" style={{ fontSize: 11, color: c.ink, marginTop: 1 }}>
                  {run.time}
                </TText>
              </View>
              <View>
                <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>SEAT</Eyebrow>
                <TText variant="mono" style={{ fontSize: 11, color: c.ink, marginTop: 1 }}>
                  {run.id.toUpperCase()}
                </TText>
              </View>
            </View>
          </View>
        </View>

        {/* Perforated tear line — column of small circles */}
        <TearLine height={contentH} x={tearX} stroke={c.ink} />

        {/* RIGHT STUB — stats */}
        <View style={{ width: rightW, paddingHorizontal: 14, paddingVertical: 16, justifyContent: 'space-between' }}>
          <View>
            <TText variant="mono" style={{ fontSize: 8, color: c.ink3, letterSpacing: 2, marginBottom: 10 }}>STUB</TText>
            <View style={{ height: 0.8, backgroundColor: 'rgba(20,17,13,0.15)', marginBottom: 14 }} />

            {/* Distance */}
            <View style={{ marginBottom: 14 }}>
              <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>DISTANCE</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                <TText variant="monoSemi" style={{ fontSize: Math.min(rightW * 0.28, 28), color: c.ink, letterSpacing: -1, lineHeight: Math.min(rightW * 0.28, 28) }}>
                  {fmtDist(run.distance, units)}
                </TText>
                <TText variant="mono" style={{ fontSize: 9, color: c.ink3, marginLeft: 3 }}>
                  {distUnit(units)}
                </TText>
              </View>
            </View>

            {/* Pace */}
            <View style={{ marginBottom: 14 }}>
              <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>AVG PACE</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                <TText variant="monoSemi" style={{ fontSize: Math.min(rightW * 0.22, 20), color: c.ink, letterSpacing: -0.5, lineHeight: Math.min(rightW * 0.22, 20) }}>
                  {fmtPace(run.pace, units)}
                </TText>
                <TText variant="mono" style={{ fontSize: 8, color: c.ink3, marginLeft: 2 }}>/{distUnit(units)}</TText>
              </View>
            </View>

            {/* Time */}
            <View style={{ marginBottom: 14 }}>
              <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>DURATION</Eyebrow>
              <TText variant="monoSemi" style={{ fontSize: Math.min(rightW * 0.22, 20), color: c.ink, letterSpacing: -0.5, marginTop: 2 }}>
                {fmtTime(run.seconds)}
              </TText>
            </View>

            {/* Fourth stat — richest available metric (GAP / cadence / VO₂ …),
                elevation as fallback so the slot is never empty */}
            <View>
              <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>{stubExtra.label}</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                <TText variant="mono" style={{ fontSize: Math.min(rightW * 0.18, 16), color: c.ink2, letterSpacing: -0.3, lineHeight: Math.min(rightW * 0.18, 16) }}>
                  {stubExtra.value}
                </TText>
                {stubExtraUnit && (
                  <TText variant="mono" style={{ fontSize: 8, color: c.ink3, marginLeft: 2 }}>{stubExtraUnit}</TText>
                )}
              </View>
            </View>
          </View>

          {/* Run title at the bottom of stub */}
          <View>
            <View style={{ height: 0.8, backgroundColor: 'rgba(20,17,13,0.15)', marginBottom: 8 }} />
            <TText variant="serifItalic" style={{ fontSize: 10, color: c.ink2, lineHeight: 13 }} numberOfLines={2}>
              {run.title}
            </TText>
          </View>
        </View>
      </View>

      {/* Bottom airmail stripe band above barcode */}
      <AirmailStripe width={width} height={stripH} position="bottom" bottomOffset={barcodeH} />

      {/* Barcode strip at the very bottom */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: barcodeH, backgroundColor: '#f0e9d8', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <RunstampMark tone="ink" opacity={0.45} />
        <View style={{ flex: 1 }}>
          <Barcode width={0} height={28} seed={seedFromId(run.id)} inkColor={c.ink} />
        </View>
        <TText variant="mono" style={{ fontSize: 7, color: c.ink3 }}>
          {run.date}
        </TText>
      </View>
    </View>
  );
}

function cityCode(city: string): string {
  // Take first 3 chars and uppercase — mimics IATA codes
  return city.slice(0, 3).toUpperCase();
}

function formatBoardingDate(iso: string): string {
  // "2026-05-14" → "14 MAY 26"
  const [year, month, day] = iso.split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const m = months[(parseInt(month, 10) - 1) % 12];
  return `${day} ${m} ${year.slice(2)}`;
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface BarcodeProps {
  width: number;
  height: number;
  seed: number;
  inkColor: string;
}

// Renders a fake barcode strip — deterministic widths from a seeded generator
function Barcode({ height, seed, inkColor }: BarcodeProps) {
  const barCount = 52;
  const rands = seededSequence(seed, barCount);

  // Each bar gets a weight: narrow (1) or wide (2.5), with spacing
  type Bar = { w: number; space: number };
  const bars: Bar[] = rands.map((r) => ({
    w: r < 0.65 ? 1 : r < 0.88 ? 1.8 : 2.6,
    space: r < 0.4 ? 0.8 : 1.4
  }));

  const totalUnits = bars.reduce((acc, b) => acc + b.w + b.space, 0);

  return (
    <View style={{ height, overflow: 'hidden' }} onLayout={() => {}}>
      <Svg width="100%" height={height} viewBox={`0 0 ${totalUnits} ${height}`} preserveAspectRatio="none">
        {bars.reduce<{ els: React.ReactElement[]; x: number }>(({ els, x }, bar, i) => {
          const el = (
            <Rect
              key={i}
              x={x}
              y={0}
              width={bar.w}
              height={height}
              fill={inkColor}
              opacity={0.85}
            />
          );
          return { els: [...els, el], x: x + bar.w + bar.space };
        }, { els: [], x: 0 }).els}
      </Svg>
    </View>
  );
}

interface TearLineProps {
  height: number;
  x: number;
  stroke: string;
}

function TearLine({ height, stroke }: TearLineProps) {
  const circleR = 3;
  const spacing = 10;
  const count = Math.floor(height / spacing);

  return (
    <View style={{ position: 'absolute', top: 0, width: 1 }}>
      <Svg width={circleR * 2 + 2} height={height} style={{ position: 'absolute', left: -circleR - 1 }}>
        {Array.from({ length: count }).map((_, i) => (
          <Circle
            key={i}
            cx={circleR + 1}
            cy={i * spacing + circleR + (height - count * spacing) / 2}
            r={circleR}
            fill="#f0e9d8"
            stroke={stroke}
            strokeWidth={0.5}
            strokeOpacity={0.35}
          />
        ))}
      </Svg>
    </View>
  );
}

interface AirmailStripeProps {
  width: number;
  height: number;
  position: 'top' | 'bottom';
  bottomOffset?: number;
}

function AirmailStripe({ width, height, position, bottomOffset = 0 }: AirmailStripeProps) {
  const stripeW = 12;
  const count = Math.ceil(width / stripeW) + 2;
  const posStyle = position === 'top'
    ? { top: 0, left: 0, right: 0 }
    : { bottom: bottomOffset, left: 0, right: 0 };

  return (
    <View style={{ position: 'absolute', ...posStyle, height, overflow: 'hidden', flexDirection: 'row' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: stripeW,
            height: height * 2.5,
            backgroundColor: i % 3 === 0 ? '#c13020' : i % 3 === 1 ? '#1a3a8c' : '#f0e9d8',
            transform: [{ rotate: '-45deg' }, { translateY: -height * 0.4 }],
            opacity: 0.9
          }}
        />
      ))}
    </View>
  );
}
