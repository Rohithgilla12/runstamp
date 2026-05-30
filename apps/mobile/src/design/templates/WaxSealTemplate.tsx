import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Path,
  Rect,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtTime } from '../../lib/format';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { PAD, type Units } from './shared';
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

// Seeded LCG — Mulberry32-inspired, deterministic.
// No Math.random() in render; seed derived from run.id character codes.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 0xffffffff;
  };
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// WaxSealTemplate
//
// Ornate circular badge designed for PB / mythic achievement moments.
// A large central circle filled with c.accentDeep, bordered by a gold-ish ring.
// 12 radial "ribbon" rectangles emerge from behind the seal at 30°-spaced angles.
// Around the rim, curved TextPath reads: "PERSONAL BEST · <dist> KM · <city> · <date>"
// In the centre: time in big mono, run title in italic underneath.
// The background bleeds through the gaps between ribbons.
export function WaxSealTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng }: Props) {
  const c = useColors();

  const sealSize = Math.min(width, height) * 0.72;
  const cx = width / 2;
  const cy = height / 2;

  const rimText = `PERSONAL BEST · ${fmtDist(run.distance, units)} ${distUnit(units).toUpperCase()} · ${(run.city || 'RUNSTAMP').toUpperCase()} · ${formatWaxDate(run.date)} `;

  // Derive ribbon offsets deterministically
  const rand = mulberry32(seedFromId(run.id));
  const ribbonOffsets = Array.from({ length: 12 }, () => (rand() - 0.5) * 4);

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: c.paper2, overflow: 'hidden' }}>

      {/* Backdrop */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.30 }}>
          <RouteMap rawLatLng={rawLatLng} width={width} height={height} style="dark" accent={c.accentDeep} routeStrokeWidth={3} animate={false} flat />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.55}
          fallback={
            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1714' }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 28 - 60, left: -20, width: width + 40,
                  height: 10, backgroundColor: 'rgba(243,237,226,0.03)', transform: [{ rotate: '-10deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.ink, opacity: 0.92 }} />
      )}

      {/* Translucent dark scrim so ribbons and seal pop */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(14,13,11,0.45)' }} />

      {/* Run title + date at the top */}
      <View style={{ position: 'absolute', top: PAD.xl, left: PAD.lg, right: PAD.lg, alignItems: 'center' }}>
        <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 8 }}>
          {run.day.toUpperCase()} · {run.city.toUpperCase()}
        </Eyebrow>
        <TText
          variant="serifItalic"
          style={{ fontSize: 13, color: 'rgba(243,237,226,0.7)', marginTop: PAD.xs, textAlign: 'center', lineHeight: 17 }}
          numberOfLines={2}
        >
          {run.title}
        </TText>
      </View>

      {/* The SVG canvas: ribbons + seal + rim text */}
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <WaxSealSVG
          width={width}
          height={height}
          cx={cx}
          cy={cy}
          sealSize={sealSize}
          accentDeep={c.accentDeep}
          accent={c.accent}
          rimText={rimText}
          time={fmtTime(run.seconds)}
          runTitle={run.title}
          ribbonOffsets={ribbonOffsets}
        />
      </View>

      {/* Bottom strip */}
      <View style={{ position: 'absolute', bottom: PAD.lg, left: PAD.lg, right: PAD.lg }}>
        <View style={{ flexDirection: 'row', height: 2 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? c.accent : 'rgba(243,237,226,0.7)' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: PAD.xs }}>
          <RunstampMark tone="paper" opacity={0.5} />
          <TText variant="mono" style={{ fontSize: 8, color: 'rgba(243,237,226,0.45)', letterSpacing: 1 }}>
            {formatWaxDate(run.date)}
          </TText>
        </View>
      </View>
    </View>
  );
}

function formatWaxDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const m = months[(parseInt(month, 10) - 1) % 12];
  return `${day} ${m} ${year.slice(2)}`;
}

interface WaxSealSVGProps {
  width: number;
  height: number;
  cx: number;
  cy: number;
  sealSize: number;
  accentDeep: string;
  accent: string;
  rimText: string;
  time: string;
  runTitle: string;
  ribbonOffsets: number[];
}

function WaxSealSVG({
  width,
  height,
  cx,
  cy,
  sealSize,
  accentDeep,
  accent,
  rimText,
  time,
  runTitle,
  ribbonOffsets
}: WaxSealSVGProps) {
  const sealR = sealSize / 2;

  // Gold ring just outside the seal
  const goldRingR = sealR + 4;
  const goldColor = '#c8a84b';
  const goldColorLight = '#e4c97a';

  // Rim TextPath radii
  const rimTextR = goldRingR + 8;
  const rimArcId = `wax-rim-arc-${Math.round(sealSize)}`;

  // Full-circle arc for TextPath — traveller goes clockwise
  // We split into top and bottom arcs; use top for the curving text
  const rimArcD = `M ${cx - rimTextR} ${cy} A ${rimTextR} ${rimTextR} 0 1 1 ${cx + rimTextR} ${cy} A ${rimTextR} ${rimTextR} 0 1 1 ${cx - rimTextR} ${cy}`;

  // Ribbon dimensions
  const ribbonW = Math.max(10, sealSize * 0.055);
  const ribbonLen = sealR * 1.55;

  // Inner content layout
  const timeFontSize = Math.min(sealSize * 0.22, 56);
  const titleFontSize = Math.min(sealSize * 0.085, 16);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <Path id={rimArcId} d={rimArcD} />
      </Defs>

      {/* 12 radial ribbons — behind the seal */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angleDeg = i * 30 + (ribbonOffsets[i] ?? 0);
        const angleRad = (angleDeg * Math.PI) / 180;
        const pivotX = cx + Math.cos(angleRad) * (sealR - ribbonLen * 0.15);
        const pivotY = cy + Math.sin(angleRad) * (sealR - ribbonLen * 0.15);
        return (
          <Rect
            key={i}
            x={pivotX - ribbonW / 2}
            y={pivotY - ribbonLen * 0.5}
            width={ribbonW}
            height={ribbonLen}
            rx={ribbonW * 0.25}
            fill={accentDeep}
            opacity={0.62}
            transform={`rotate(${angleDeg}, ${pivotX}, ${pivotY})`}
          />
        );
      })}

      {/* Gold outer ring — glow suggestion */}
      <Circle cx={cx} cy={cy} r={goldRingR + 3} fill="none" stroke={goldColor} strokeWidth={1.2} opacity={0.25} />
      <Circle cx={cx} cy={cy} r={goldRingR} fill="none" stroke={goldColorLight} strokeWidth={2.2} opacity={0.55} />
      <Circle cx={cx} cy={cy} r={goldRingR - 3} fill="none" stroke={goldColor} strokeWidth={0.7} opacity={0.35} />

      {/* Main seal circle */}
      <Circle cx={cx} cy={cy} r={sealR} fill={accentDeep} />

      {/* Inner detail ring */}
      <Circle cx={cx} cy={cy} r={sealR - 8} fill="none" stroke="rgba(243,237,226,0.22)" strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={sealR - 13} fill="none" stroke="rgba(243,237,226,0.12)" strokeWidth={0.5} strokeDasharray="2 3" />

      {/* Time — big mono in the centre */}
      <SvgText
        x={cx}
        y={cy + timeFontSize * 0.35}
        fontSize={timeFontSize}
        fill="rgba(243,237,226,0.95)"
        textAnchor="middle"
        fontFamily="JetBrainsMono_600SemiBold"
        letterSpacing={-1}
      >
        {time}
      </SvgText>

      {/* Run title in italic serif below time */}
      <SvgText
        x={cx}
        y={cy + timeFontSize * 0.35 + titleFontSize + 8}
        fontSize={titleFontSize}
        fill="rgba(243,237,226,0.65)"
        textAnchor="middle"
        fontFamily="InstrumentSerif_400Regular_Italic"
        letterSpacing={0.3}
      >
        {runTitle.length > 22 ? runTitle.slice(0, 22) + '…' : runTitle}
      </SvgText>

      {/* Small "PERSONAL BEST" label above time */}
      <SvgText
        x={cx}
        y={cy + timeFontSize * 0.35 - timeFontSize - 4}
        fontSize={Math.max(7, sealSize * 0.04)}
        fill="rgba(243,237,226,0.55)"
        textAnchor="middle"
        fontFamily="JetBrainsMono_500Medium"
        letterSpacing={2.5}
      >
        PERSONAL BEST
      </SvgText>

      {/* Rim text curving around the perimeter */}
      <SvgText
        fill="rgba(243,237,226,0.70)"
        fontSize={Math.max(7, sealSize * 0.048)}
        fontFamily="JetBrainsMono_500Medium"
        letterSpacing={1.8}
      >
        <TextPath href={`#${rimArcId}`} startOffset="0%" textAnchor="start">
          {rimText}
        </TextPath>
      </SvgText>

      {/* Accent accent ring outside gold — very subtle */}
      <Circle cx={cx} cy={cy} r={goldRingR + 9} fill="none" stroke={accent} strokeWidth={0.5} opacity={0.18} />
    </Svg>
  );
}
