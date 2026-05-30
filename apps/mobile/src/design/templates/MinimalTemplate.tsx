import React from 'react';
import { View } from 'react-native';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatLongDate, type Units } from './shared';
import { PhotoBackground } from './PhotoBackground';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
  // Privacy-masked raw lat/lng — when present, the map background renders real
  // OSM tiles. null/undefined falls back to the bare paper-and-ink path.
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
}

// MinimalTemplate (PRD §6.3)
//
// "Clean, modern, no metaphor — for runners who hate the cute stuff."
//
// No perforations, no postmarks, no halftone. A single block of well-set
// type does the talking: serif italic title up top, JetBrains Mono distance
// dominating the middle, pace / time / elevation in a small mono row, a
// single solar hairline as the only colour. Background is paper (light or
// dark theme-aware).
export function MinimalTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng }: Props) {
  const c = useColors();

  const distFont = Math.min(width * 0.30, 120);
  const unitLabel = distUnit(units).toUpperCase();

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: c.paper, overflow: 'hidden' }}>
      {/* Background variants — kept extremely subtle so the type rules. */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
          <RouteMap rawLatLng={rawLatLng} width={width} height={height} style="light" accent={c.accent} routeStrokeWidth={2} animate={false} flat />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.4}
          fallback={<View style={{ position: 'absolute', inset: 0, backgroundColor: c.paper2 }} />}
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.04 }} />
      )}

      {/* Top: tiny eyebrow + serif title. No ornament. */}
      <View style={{ paddingHorizontal: PAD.xl, paddingTop: PAD.xl + 6 }}>
        <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>
          {formatLongDate(run.date).toUpperCase()}
        </Eyebrow>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22, color: c.ink, marginTop: 6, lineHeight: 26, letterSpacing: -0.3 }}
          numberOfLines={2}
        >
          {run.title}
        </TText>
      </View>

      {/* Centre: distance dominates. JetBrains Mono, negative tracking. */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: PAD.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <TText
            variant="monoSemi"
            style={{ fontSize: distFont, lineHeight: distFont, letterSpacing: -4, color: c.ink }}
          >
            {fmtDist(run.distance, units)}
          </TText>
          <TText
            variant="mono"
            style={{ fontSize: 18, color: c.ink3, marginLeft: 8, letterSpacing: 1 }}
          >
            {unitLabel}
          </TText>
        </View>
        {/* Single solar hairline — the only saturated thing on the card. */}
        <View style={{ width: 38, height: 1.5, backgroundColor: c.accent, marginTop: PAD.lg, opacity: 0.9 }} />
      </View>

      {/* Bottom stats row — three columns separated by hairlines. */}
      <View style={{
        flexDirection: 'row', paddingHorizontal: PAD.xl, paddingBottom: PAD.xl,
        borderTopWidth: 0.6, borderTopColor: c.line,
        paddingTop: PAD.md,
      }}>
        <MinimalStat label="PACE" value={`${fmtPace(run.pace, units)}/${distUnit(units)}`} ink={c.ink} sub={c.ink3} />
        <Sep ink={c.line} />
        <MinimalStat label="TIME" value={fmtTime(run.seconds)} ink={c.ink} sub={c.ink3} />
        <Sep ink={c.line} />
        <MinimalStat label="ELEV" value={`${run.elev}m`} ink={c.ink} sub={c.ink3} />
      </View>

      {/* Footer mark — paper-thin "RUNSTAMP" so the surface is signed. */}
      <View style={{ position: 'absolute', bottom: 4, right: PAD.xl }}>
        <TText variant="mono" style={{ fontSize: 7, color: c.ink3, letterSpacing: 3, opacity: 0.55 }}>RUNSTAMP</TText>
      </View>
    </View>
  );
}

function MinimalStat({ label, value, ink, sub }: { label: string; value: string; ink: string; sub: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Eyebrow style={{ color: sub, fontSize: EYEBROW_SIZE }}>{label}</Eyebrow>
      <TText variant="mono" style={{ fontSize: 16, color: ink, marginTop: 4, letterSpacing: -0.3 }}>
        {value}
      </TText>
    </View>
  );
}

function Sep({ ink }: { ink: string }) {
  return <View style={{ width: 0.6, backgroundColor: ink, marginVertical: 4 }} />;
}
