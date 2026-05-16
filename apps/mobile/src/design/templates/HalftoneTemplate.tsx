import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatShortDate, type Units } from './shared';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
}

// HalftoneTemplate (PRD §6.3 — "Halftone")
//
// Newsprint-era dot pattern over a photo / map. Gradient dots from dense
// (top) to sparse (bottom) give the card a vintage tabloid-front feel; a
// bold sans-serif headline + masthead-style date strip carries the type.
//
// Inspired by the print culture branch of the reference triangle in
// .impeccable.md — Polaroid / Field Notes / Risograph print shops.
export function HalftoneTemplate({ run, width, height, background, units = 'km' }: Props) {
  const c = useColors();

  const inkTone = '#14110d';
  const paperTone = '#f0e9d8';

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: paperTone, overflow: 'hidden' }}>
      {/* Background layer — bleeds behind the halftone dots. */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
          <RouteMap points={run.route} width={width} height={height} style="dark" accent={c.accent} routeStrokeWidth={3} flat />
        </View>
      )}
      {background === 'photo' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1714' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{
              position: 'absolute', top: i * 40 - 50, left: -20, width: width + 40,
              height: 20, backgroundColor: 'rgba(243,237,226,0.05)', transform: [{ rotate: '-8deg' }],
            }} />
          ))}
        </View>
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.85 }} />
      )}

      {/* The halftone dot field — denser at the top, sparser toward the bottom. */}
      <HalftoneField width={width} height={height} ink={inkTone} />

      {/* Light scrim so type reads on top of the dots. */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(240,233,216,0.32)' }} />

      {/* Masthead — date strip on a thick rule, like a newspaper plate. */}
      <View style={{ paddingTop: PAD.lg, paddingHorizontal: PAD.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow style={{ color: inkTone, opacity: 0.65, fontSize: EYEBROW_SIZE }}>RUNSTAMP — DAILY</Eyebrow>
          <TText variant="mono" style={{ fontSize: 10, color: inkTone, opacity: 0.6, letterSpacing: 1 }}>
            {formatShortDate(run.date).toUpperCase()}
          </TText>
        </View>
        <View style={{ height: 4, backgroundColor: inkTone, marginTop: 6 }} />
        <View style={{ height: 0.8, backgroundColor: inkTone, marginTop: 3, opacity: 0.7 }} />
      </View>

      {/* Tabloid headline. Bold all-caps serif sized to fill width. */}
      <View style={{ paddingHorizontal: PAD.lg, marginTop: PAD.lg }}>
        <TText
          variant="serif"
          style={{
            fontSize: Math.min(width * 0.13, 50),
            color: inkTone,
            letterSpacing: -1,
            lineHeight: Math.min(width * 0.13, 50) * 0.95,
            textTransform: 'uppercase',
          }}
          numberOfLines={3}
        >
          {run.title}
        </TText>
      </View>

      {/* The big distance number — fills the lower half. */}
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: PAD.lg, paddingBottom: PAD.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <TText
            variant="monoSemi"
            style={{
              fontSize: Math.min(width * 0.32, 130),
              color: inkTone,
              letterSpacing: -5,
              lineHeight: Math.min(width * 0.32, 130),
            }}
          >
            {fmtDist(run.distance, units)}
          </TText>
          <TText
            variant="mono"
            style={{ fontSize: 18, color: inkTone, marginLeft: 8, letterSpacing: 2 }}
          >
            {distUnit(units).toUpperCase()}
          </TText>
        </View>

        <View style={{ height: 0.8, backgroundColor: inkTone, marginTop: PAD.md, opacity: 0.5 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: PAD.md }}>
          <PageStat label="PACE" value={`${fmtPace(run.pace, units)}/${distUnit(units)}`} ink={inkTone} />
          <PageStat label="TIME" value={fmtTime(run.seconds)} ink={inkTone} />
          <PageStat label="ELEV" value={`${run.elev}m`} ink={inkTone} />
          {run.avgHr > 0 ? <PageStat label="HR" value={`${run.avgHr}`} ink={inkTone} /> : null}
        </View>
      </View>
    </View>
  );
}

function PageStat({ label, value, ink }: { label: string; value: string; ink: string }) {
  return (
    <View>
      <Eyebrow style={{ color: ink, opacity: 0.55, fontSize: EYEBROW_SIZE }}>{label}</Eyebrow>
      <TText variant="mono" style={{ fontSize: 13, color: ink, opacity: 0.9, marginTop: 4, letterSpacing: -0.2 }}>
        {value}
      </TText>
    </View>
  );
}

// Halftone dot field. Dot radius increases linearly from top to bottom so
// the visual weight feels like an old newspaper photo plate — dense ink at
// the top fading to whisper at the bottom.
function HalftoneField({ width, height, ink }: { width: number; height: number; ink: string }) {
  const cellSize = 7;
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  const dots: React.ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    const yProgress = row / rows;
    // Smooth fade — densest at top, near-zero at bottom.
    const radius = (1 - yProgress) * 2.4 + 0.4;
    const opacity = (1 - yProgress) * 0.45 + 0.05;
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : cellSize / 2;
      const cx = col * cellSize + offsetX;
      const cy = row * cellSize + cellSize / 2;
      dots.push(
        <Circle key={`${row}-${col}`} cx={cx} cy={cy} r={radius} fill={ink} opacity={opacity} />,
      );
    }
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <G>{dots}</G>
    </Svg>
  );
}
