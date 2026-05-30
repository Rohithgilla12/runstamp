import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, TONE, formatLongDate, type Units } from './shared';
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

// CoordinatesTemplate
//
// A surveyor's grid-reference / passport entry-point stamp. The start
// latitude + longitude set large in JetBrains Mono are the hero — the exact
// point on Earth where the run began, read like a chart fix. City + country
// in Instrument Serif italic beneath; a registration crosshair in solar (the
// one warm pop) marks the fix; a faint contained route map sits framed in the
// lower band so the design + type lead, never the map. Distance + date read
// in a quiet mono eyebrow row.
//
// Coordinate source, in order: run.startLat/startLon → centre of rawLatLng →
// none (lead with city + distance instead, no empty slot).
export function CoordinatesTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng }: Props) {
  const c = useColors();

  // Dark chart field regardless of theme — a surveyor's plate reads as ink.
  const field = c.ink;
  const onField = c.paper;
  const onFieldDim = 'rgba(243,237,226,0.55)';
  const onFieldFaint = 'rgba(243,237,226,0.30)';
  const gridLine = 'rgba(243,237,226,0.07)';

  const fix = resolveFix(run, rawLatLng);
  const hasCoords = fix !== null;

  // Seeded, stable micro-tilt on the registration mark so the fix reads as
  // ink-pressed rather than printed. Keyed off run.id — no Math.random.
  const rand = mulberry32(hashId(run.id));
  const markTilt = (rand() - 0.5) * 3.2; // ~±1.6deg

  // Hero sizing scales off the canvas; coordinates need to breathe but never
  // overflow on narrow cards.
  const coordFont = Math.min(width * 0.155, 56);
  const cityFont = Math.min(width * 0.085, 30);

  // The contained map band sits in the lower third, framed — a backdrop
  // element, never full-bleed.
  const bandH = Math.round(height * 0.30);
  const bandInset = PAD.lg;
  const mapW = width - bandInset * 2;

  const distLabel = `${fmtDist(run.distance, units)} ${distUnit(units).toUpperCase()}`;

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: field, overflow: 'hidden' }}>
      {/* Faint surveyor's grid across the whole plate — the chart paper. */}
      <GridField width={width} height={height} line={gridLine} />

      {/* Photo background (when chosen) sits behind everything, dimmed, with a
          scrim so the mono hero stays legible. Map/solid keep the ink plate. */}
      {background === 'photo' && (
        <>
          <PhotoBackground
            uri={photoUri}
            width={width}
            height={height}
            opacity={0.42}
            fallback={<View style={{ position: 'absolute', inset: 0, backgroundColor: TONE.inkDark }} />}
          />
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: TONE.scrimInk }} />
        </>
      )}

      {/* Header eyebrow row: grid-reference label + date. */}
      <View style={{
        paddingHorizontal: PAD.xl, paddingTop: PAD.xl,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <Eyebrow style={{ color: onFieldDim, fontSize: EYEBROW_SIZE }}>GRID REFERENCE</Eyebrow>
        <Eyebrow style={{ color: onFieldDim, fontSize: EYEBROW_SIZE }}>{formatLongDate(run.date)}</Eyebrow>
      </View>

      {/* Hero block — coordinates, or a graceful city-led fallback. */}
      <View style={{ flex: 1, paddingHorizontal: PAD.xl, justifyContent: 'center' }}>
        {hasCoords ? (
          <>
            <CoordLine value={fix.lat} font={coordFont} ink={onField} dim={onFieldFaint} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <CoordLine value={fix.lon} font={coordFont} ink={onField} dim={onFieldFaint} />
              {/* The one warm pop: a registration crosshair marking the fix. */}
              <View style={{ marginLeft: PAD.md, transform: [{ rotate: `${markTilt}deg` }] }}>
                <RegistrationMark size={Math.round(coordFont * 0.62)} color={c.accent} />
              </View>
            </View>
          </>
        ) : (
          // No usable coordinates (treadmill / unimported): lead with distance
          // as the fix and city beneath. Never an empty coordinate slot.
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoSemi" style={{ fontSize: Math.min(width * 0.26, 96), lineHeight: Math.min(width * 0.26, 96), letterSpacing: -3, color: onField }}>
              {fmtDist(run.distance, units)}
            </TText>
            <TText variant="mono" style={{ fontSize: 16, color: onFieldDim, marginLeft: 8, letterSpacing: 1 }}>
              {distUnit(units).toUpperCase()}
            </TText>
            <View style={{ marginLeft: PAD.md, alignSelf: 'center', transform: [{ rotate: `${markTilt}deg` }] }}>
              <RegistrationMark size={26} color={c.accent} />
            </View>
          </View>
        )}

        {/* City + country — Instrument Serif italic, the place-name moment. */}
        <View style={{ marginTop: PAD.lg }}>
          <TText
            variant="serifItalic"
            style={{ fontSize: cityFont, color: onField, lineHeight: cityFont * 1.05, letterSpacing: -0.4 }}
            numberOfLines={1}
          >
            {run.city || run.title}
          </TText>
          {run.country ? (
            <Eyebrow style={{ color: onFieldDim, fontSize: EYEBROW_SIZE, marginTop: 6 }}>
              {run.country.toUpperCase()}
            </Eyebrow>
          ) : null}
        </View>

        {/* Quiet metric line — distance shown here only when coords led above
            (otherwise distance is already the hero). */}
        {hasCoords ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: PAD.lg }}>
            <Metric value={distLabel} ink={onField} />
            <Tick color={onFieldFaint} />
            <Metric value={`${fmtPace(run.pace, units)} /${distUnit(units)}`} ink={onField} />
            <Tick color={onFieldFaint} />
            <Metric value={fmtTime(run.seconds)} ink={onField} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: PAD.lg }}>
            <Metric value={`${fmtPace(run.pace, units)} /${distUnit(units)}`} ink={onField} />
            <Tick color={onFieldFaint} />
            <Metric value={fmtTime(run.seconds)} ink={onField} />
            {run.elev > 0 ? (
              <>
                <Tick color={onFieldFaint} />
                <Metric value={`${run.elev} m`} ink={onField} />
              </>
            ) : null}
          </View>
        )}
      </View>

      {/* Contained route map — framed band in the lower third, hairline border
          and corner ticks so it reads as a chart inset, not a backdrop. Only
          rendered for the map background; otherwise the plate stays clean. */}
      {background === 'map' ? (
        <View style={{
          marginHorizontal: bandInset,
          marginBottom: PAD.lg + 14,
          height: bandH,
          borderWidth: 0.7,
          borderColor: 'rgba(243,237,226,0.16)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <View style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
            {/* Route drawn in a neutral paper tone, NOT solar — the crosshair
                stays the single warm pop on the plate. */}
            <RouteMap
              points={run.route}
              rawLatLng={rawLatLng}
              width={mapW}
              height={bandH}
              style="dark"
              accent="rgba(243,237,226,0.7)"
              routeStrokeWidth={2.5}
              animate={false}
              flat
            />
          </View>
          {/* Corner registration ticks frame the inset. */}
          <CornerTicks width={mapW} height={bandH} color={onFieldFaint} />
        </View>
      ) : (
        // Non-map backgrounds: a thin baseline rule keeps the bottom anchored
        // without forcing a map slot.
        <View style={{ marginHorizontal: PAD.xl, marginBottom: PAD.lg + 14, height: 0.7, backgroundColor: 'rgba(243,237,226,0.14)' }} />
      )}

      {/* Footer attribution. */}
      <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' }}>
        <RunstampMark tone="paper" opacity={0.4} />
      </View>
    </View>
  );
}

interface Fix { lat: string; lon: string }

// Resolve the run's start fix to display strings, or null when unavailable.
function resolveFix(run: Activity, rawLatLng?: ReadonlyArray<readonly [number, number]> | null): Fix | null {
  if (typeof run.startLat === 'number' && typeof run.startLon === 'number') {
    return { lat: fmtLat(run.startLat), lon: fmtLon(run.startLon) };
  }
  if (rawLatLng && rawLatLng.length > 0) {
    // rawLatLng is [lat, lng]-ordered (matching RouteMap's projection); take
    // the centroid as an approximate centre when no explicit start is set.
    let sumLat = 0;
    let sumLon = 0;
    for (const p of rawLatLng) {
      sumLat += p[0];
      sumLon += p[1];
    }
    return { lat: fmtLat(sumLat / rawLatLng.length), lon: fmtLon(sumLon / rawLatLng.length) };
  }
  return null;
}

// "18.9396° N" — four decimal places (≈11 m) reads as a survey fix.
function fmtLat(lat: number): string {
  const hemi = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(4)}° ${hemi}`;
}

function fmtLon(lon: number): string {
  const hemi = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(4)}° ${hemi}`;
}

// A coordinate line: the numeric part in mono-semibold, the hemisphere letter
// dimmed and spaced so the number stays the brag.
function CoordLine({ value, font, ink, dim }: { value: string; font: number; ink: string; dim: string }) {
  const idx = value.lastIndexOf('° ');
  const num = idx >= 0 ? value.slice(0, idx) : value;
  const tail = idx >= 0 ? value.slice(idx) : '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <TText variant="monoSemi" style={{ fontSize: font, lineHeight: font * 1.02, letterSpacing: -1.5, color: ink }}>
        {num}
      </TText>
      {tail ? (
        <TText variant="mono" style={{ fontSize: font * 0.42, color: dim, marginLeft: 6, letterSpacing: 1 }}>
          {tail.replace('° ', '°')}
        </TText>
      ) : null}
    </View>
  );
}

function Metric({ value, ink }: { value: string; ink: string }) {
  return (
    <TText variant="mono" style={{ fontSize: 12, color: ink, opacity: 0.8, letterSpacing: -0.2 }}>
      {value}
    </TText>
  );
}

function Tick({ color }: { color: string }) {
  return <View style={{ width: 0.8, height: 11, backgroundColor: color }} />;
}

// Surveyor's registration crosshair — a ringed cross-tick. Solar, the single
// warm pop on the plate.
function RegistrationMark({ size, color }: { size: number; color: string }) {
  const c = size / 2;
  const r = c - size * 0.16;
  const arm = size * 0.5;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={size * 0.05} />
      <Circle cx={c} cy={c} r={r * 0.18} fill={color} />
      {/* Cross arms extend just past the ring. */}
      <Line x1={c} y1={c - arm} x2={c} y2={c - r * 0.4} stroke={color} strokeWidth={size * 0.05} strokeLinecap="round" />
      <Line x1={c} y1={c + r * 0.4} x2={c} y2={c + arm} stroke={color} strokeWidth={size * 0.05} strokeLinecap="round" />
      <Line x1={c - arm} y1={c} x2={c - r * 0.4} y2={c} stroke={color} strokeWidth={size * 0.05} strokeLinecap="round" />
      <Line x1={c + r * 0.4} y1={c} x2={c + arm} y2={c} stroke={color} strokeWidth={size * 0.05} strokeLinecap="round" />
    </Svg>
  );
}

// Faint surveyor's grid filling the plate. Light, even, never competes with
// the type — pure chart-paper texture.
function GridField({ width, height, line }: { width: number; height: number; line: string }) {
  const step = 28;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <G>
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <Line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={height} stroke={line} strokeWidth={0.5} />
        ))}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * step} x2={width} y2={i * step} stroke={line} strokeWidth={0.5} />
        ))}
      </G>
    </Svg>
  );
}

// L-shaped corner ticks framing the contained map inset.
function CornerTicks({ width, height, color }: { width: number; height: number; color: string }) {
  const t = 9;
  const m = 5;
  const w = 1;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {/* TL */}
      <Path d={`M${m} ${m + t} L${m} ${m} L${m + t} ${m}`} fill="none" stroke={color} strokeWidth={w} />
      {/* TR */}
      <Path d={`M${width - m - t} ${m} L${width - m} ${m} L${width - m} ${m + t}`} fill="none" stroke={color} strokeWidth={w} />
      {/* BL */}
      <Path d={`M${m} ${height - m - t} L${m} ${height - m} L${m + t} ${height - m}`} fill="none" stroke={color} strokeWidth={w} />
      {/* BR */}
      <Path d={`M${width - m - t} ${height - m} L${width - m} ${height - m} L${width - m} ${height - m - t}`} fill="none" stroke={color} strokeWidth={w} />
    </Svg>
  );
}

// Stable 32-bit hash of the run id → seed for the LCG. Keeps the registration
// mark's micro-tilt identical across renders (no Math.random in render path).
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
