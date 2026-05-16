import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatShortDate, type Units } from './shared';
import { PhotoBackground } from './PhotoBackground';
import { RunstampMark } from '../RunstampMark';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
}

// RisoTemplate (PRD §6.3 — "Riso")
//
// Risograph two-color overlay. Pink and blue ink plates, intentionally
// mis-registered so each layer offsets by a few pixels — that's the
// signature riso look. The route polyline overlays in pink while the
// distance numeral renders in blue, with one cross-printed where they
// overlap. Off-white paper underneath.
//
// Like CyanotypeTemplate this bypasses the live theme accent — riso's
// charm is the strict 2-spot-colour palette.
export function RisoTemplate({ run, width, height, background, units = 'km', photoUri }: Props) {
  const c = useColors();
  void c;

  // Classic riso pink + blue
  const PINK = '#ff5b8a';
  const BLUE = '#2a4fb5';
  const PAPER = '#f3ecdb';

  // Subtle mis-registration offset in pixels.
  const offX = 2.2;
  const offY = 1.6;

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: PAPER, overflow: 'hidden' }}>
      {/* Paper texture base. */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: PAPER }} />

      {/* Background route — drawn TWICE, once in pink, once in blue with the
          offset. Each layer renders at multiply-style blend via opacity. */}
      {background === 'map' && (
        <>
          <View style={{ position: 'absolute', top: offY, left: offX, right: -offX, bottom: -offY, opacity: 0.55 }}>
            <RouteMap points={run.route} width={width} height={height} style="light" accent={PINK} routeStrokeWidth={3.5} flat />
          </View>
          <View style={{ position: 'absolute', top: -offY, left: -offX, right: offX, bottom: offY, opacity: 0.6 }}>
            <RouteMap points={run.route} width={width} height={height} style="light" accent={BLUE} routeStrokeWidth={3.5} flat />
          </View>
        </>
      )}

      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.6}
          fallback={
            <View style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 38 - 50, left: -20, width: width + 40,
                  height: 14, backgroundColor: 'rgba(255,91,138,0.10)', transform: [{ rotate: '-8deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}

      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: PINK, opacity: 0.18 }} />
      )}

      {/* Riso speckle — random ink dots in pink + blue to evoke the medium. */}
      <RisoSpeckle width={width} height={height} pink={PINK} blue={BLUE} />

      {/* Top-left masthead */}
      <View style={{ paddingTop: PAD.xl, paddingHorizontal: PAD.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow style={{ color: BLUE, fontSize: EYEBROW_SIZE }}>RISOGRAPH — {formatShortDate(run.date).toUpperCase()}</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PINK }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE }} />
          </View>
        </View>
        <TText
          variant="serifItalic"
          style={{ fontSize: 20, color: BLUE, marginTop: 6, lineHeight: 24, letterSpacing: -0.3 }}
          numberOfLines={2}
        >
          {run.title}
        </TText>
      </View>

      {/* Distance numeral — printed in pink with a blue "ghost" offset behind. */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: PAD.lg }}>
        <View style={{ position: 'relative', alignItems: 'center' }}>
          {/* Blue ghost behind */}
          <TText
            variant="monoSemi"
            style={{
              position: 'absolute', top: 3, left: 3,
              fontSize: Math.min(width * 0.34, 140), color: BLUE, opacity: 0.8,
              letterSpacing: -5, lineHeight: Math.min(width * 0.34, 140),
            }}
          >
            {fmtDist(run.distance, units)}
          </TText>
          {/* Pink front */}
          <TText
            variant="monoSemi"
            style={{
              fontSize: Math.min(width * 0.34, 140), color: PINK, opacity: 0.92,
              letterSpacing: -5, lineHeight: Math.min(width * 0.34, 140),
            }}
          >
            {fmtDist(run.distance, units)}
          </TText>
          <TText variant="mono" style={{ fontSize: 16, color: BLUE, marginTop: 8, letterSpacing: 2 }}>
            {distUnit(units).toUpperCase()}
          </TText>
        </View>
      </View>

      {/* Bottom stats row — pink labels, blue values */}
      <View style={{ padding: PAD.xl, paddingTop: PAD.md }}>
        <View style={{ height: 1.6, backgroundColor: PINK, opacity: 0.7, marginBottom: PAD.md }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <RisoStat label="PACE" value={`${fmtPace(run.pace, units)}/${distUnit(units)}`} pink={PINK} blue={BLUE} />
          <RisoStat label="TIME" value={fmtTime(run.seconds)} pink={PINK} blue={BLUE} />
          <RisoStat label="ELEV" value={`${run.elev}m`} pink={PINK} blue={BLUE} />
          {run.city ? <RisoStat label="CITY" value={run.city.toUpperCase()} pink={PINK} blue={BLUE} /> : null}
        </View>
        <View style={{ marginTop: PAD.md, alignItems: 'center' }}>
          <RunstampMark tone="ink" opacity={0.5} />
        </View>
      </View>
    </View>
  );
}

function RisoStat({ label, value, pink, blue }: { label: string; value: string; pink: string; blue: string }) {
  return (
    <View>
      <Eyebrow style={{ color: pink, fontSize: EYEBROW_SIZE }}>{label}</Eyebrow>
      <TText variant="mono" style={{ fontSize: 13, color: blue, marginTop: 4, letterSpacing: -0.2 }}>
        {value}
      </TText>
    </View>
  );
}

// Sparse riso speckle — random pink + blue dots that evoke ink-uneven prints.
// Deterministic via the same Mulberry32 seeding the cyanotype grain uses.
function RisoSpeckle({ width, height, pink, blue }: { width: number; height: number; pink: string; blue: string }) {
  const count = 90;
  const dots: React.ReactNode[] = [];
  let s = ((width * 7919) + (height * 31)) >>> 0;
  const rng = () => {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    const cx = rng() * width;
    const cy = rng() * height;
    const r = rng() * 1.4 + 0.6;
    const colour = rng() < 0.55 ? pink : blue;
    const op = rng() * 0.18 + 0.04;
    dots.push(<Circle key={i} cx={cx} cy={cy} r={r} fill={colour} opacity={op} />);
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <G>{dots}</G>
    </Svg>
  );
}
