import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatLongDate, type Units } from './shared';
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

// CyanotypeTemplate (PRD §6.3 — "Cyanotype")
//
// Blueprint blue. Ecru-white type on deep cyan/Prussian-blue background, with
// soft grain mottle from a seeded scatter of varying-opacity dots. Suits
// trail / long-run aesthetic: the route gets the hero spot, plotted as a
// chalk-white polyline against the blue plate.
//
// Bypasses the live theme accent intentionally — cyanotype is monochromatic
// per the medium it imitates. The solar accent doesn't appear here.
export function CyanotypeTemplate({ run, width, height, background, units = 'km', photoUri }: Props) {
  const c = useColors();
  // Mute the live theme; cyanotype is its own colour space.
  void c;

  const PRUSSIAN = '#142f4f';
  const PRUSSIAN_DARK = '#0a1d33';
  const CREAM = '#f0e6cd';

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: PRUSSIAN, overflow: 'hidden' }}>
      {/* Deeper-blue plate underlayer for vignette effect. */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: PRUSSIAN_DARK, opacity: 0.55 }} />
      <View style={{ position: 'absolute', inset: 0, backgroundColor: PRUSSIAN }} />

      {/* Background — the route map is the centrepiece for this template. */}
      {background === 'map' && (
        <View style={{ position: 'absolute', top: height * 0.18, left: 0, right: 0, height: height * 0.55, opacity: 0.85 }}>
          <RouteMap
            points={run.route}
            width={width}
            height={height * 0.55}
            style="dark"
            accent={CREAM}
            routeStrokeWidth={3}
            flat
          />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.45}
          fallback={
            <View style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 32 - 50, left: -20, width: width + 40,
                  height: 12, backgroundColor: 'rgba(240,230,205,0.05)', transform: [{ rotate: '-10deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: PRUSSIAN }} />
      )}

      {/* Grain / mottle — seeded scatter dots add the wash-paper character. */}
      <Grain width={width} height={height} cream={CREAM} />

      {/* Vignette to focus eye on centre. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', inset: 0,
          shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 60, shadowOffset: { width: 0, height: 0 },
          // Soft vignette by stacking semi-transparent edges
        }}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: PRUSSIAN_DARK, opacity: 0.5 }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: PRUSSIAN_DARK, opacity: 0.65 }} />
      </View>

      {/* Top eyebrow + serif title in cream */}
      <View style={{ paddingTop: PAD.xl, paddingHorizontal: PAD.xl }}>
        <Eyebrow style={{ color: CREAM, opacity: 0.6, fontSize: EYEBROW_SIZE }}>
          CYANOTYPE — {formatLongDate(run.date).toUpperCase()}
        </Eyebrow>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22, color: CREAM, marginTop: 6, lineHeight: 26, letterSpacing: -0.3 }}
          numberOfLines={2}
        >
          {run.title}
        </TText>
        <TText variant="mono" style={{ fontSize: 11, color: CREAM, opacity: 0.6, marginTop: 4, letterSpacing: 1 }}>
          {(run.city || 'RUNSTAMP').toUpperCase()}{run.country ? ` · ${run.country.toUpperCase()}` : ''}
        </TText>
      </View>

      {/* Bottom plate — big distance + stats, the cream-on-blue legend. */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: PAD.xl }}>
        <View style={{ height: 0.7, backgroundColor: CREAM, opacity: 0.35, marginBottom: PAD.md }} />

        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <TText
            variant="monoSemi"
            style={{ fontSize: Math.min(width * 0.30, 110), color: CREAM, letterSpacing: -4, lineHeight: Math.min(width * 0.30, 110) }}
          >
            {fmtDist(run.distance, units)}
          </TText>
          <TText variant="mono" style={{ fontSize: 18, color: CREAM, opacity: 0.7, marginLeft: 8, letterSpacing: 1 }}>
            {distUnit(units).toUpperCase()}
          </TText>
        </View>

        <View style={{ flexDirection: 'row', gap: PAD.lg, marginTop: PAD.md }}>
          <Plate label="PACE" value={`${fmtPace(run.pace, units)}/${distUnit(units)}`} cream={CREAM} />
          <Plate label="TIME" value={fmtTime(run.seconds)} cream={CREAM} />
          <Plate label="ELEV" value={`${run.elev}m`} cream={CREAM} />
          {run.avgHr > 0 ? <Plate label="HR" value={`${run.avgHr}`} cream={CREAM} /> : null}
        </View>
        <View style={{ marginTop: PAD.md }}>
          <RunstampMark tone="paper" opacity={0.55} />
        </View>
      </View>
    </View>
  );
}

function Plate({ label, value, cream }: { label: string; value: string; cream: string }) {
  return (
    <View>
      <Eyebrow style={{ color: cream, opacity: 0.55, fontSize: EYEBROW_SIZE }}>{label}</Eyebrow>
      <TText variant="mono" style={{ fontSize: 13, color: cream, opacity: 0.92, marginTop: 4, letterSpacing: -0.2 }}>
        {value}
      </TText>
    </View>
  );
}

// Seeded grain dots — deterministic mottle that mimics cyanotype's irregular
// chemical wash without using Math.random() (per CLAUDE.md / .impeccable.md
// performance + reproducibility rules).
function Grain({ width, height, cream }: { width: number; height: number; cream: string }) {
  const count = 220;
  const dots: React.ReactNode[] = [];
  // Mulberry32-style PRNG seeded from canvas dims so the same card layout
  // always renders the same grain.
  let s = (width * 12345 + height * 6789) >>> 0;
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
    const r = rng() < 0.7 ? rng() * 0.8 + 0.3 : rng() * 1.6 + 0.4;
    const op = rng() * 0.12 + 0.02;
    dots.push(<Circle key={i} cx={cx} cy={cy} r={r} fill={cream} opacity={op} />);
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <G>{dots}</G>
    </Svg>
  );
}
