import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Rect, Text as SvgText, TextPath } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatMonthDay, type Units } from './shared';
import { PhotoBackground } from './PhotoBackground';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
}

// PostmarkTemplate
//
// Full-bleed cancellation postmark aesthetic from PRD §6.3.
// A giant inked stamp circle dominates the canvas — city + country curved
// around the outer rim via TextPath, date wedge in the centre, distance as
// denomination at the top of the ring, pace + time as small mono labels
// along the lower arc. The route map (or photo / solid colour) bleeds behind
// the stamp, muted by a dark scrim.
export function PostmarkTemplate({ run, width, height, background, units = 'km', photoUri }: Props) {
  const c = useColors();

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: c.ink, overflow: 'hidden' }}>
      {/* Backdrop — bleed behind the stamp */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
          <RouteMap points={run.route} width={width} height={height} style="dark" accent={c.accent} routeStrokeWidth={3} flat />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          fallback={
            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1714' }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 30 - 60, left: -20, width: width + 40,
                  height: 12, backgroundColor: 'rgba(243,237,226,0.04)', transform: [{ rotate: '-12deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.7 }} />
      )}

      {/* Dark scrim so the stamp ink reads cleanly on any background */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(14,13,11,0.62)' }} />

      {/* Distance as denomination — top header strip */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: PAD.lg, paddingHorizontal: PAD.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: EYEBROW_SIZE }}>DISTANCE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <TText variant="monoSemi" style={{ fontSize: Math.min(width * 0.13, 52), color: '#f3ede2', letterSpacing: -2, lineHeight: Math.min(width * 0.13, 52) }}>
              {fmtDist(run.distance, units)}
            </TText>
            <TText variant="mono" style={{ fontSize: 13, color: 'rgba(243,237,226,0.65)', marginLeft: 5 }}>
              {distUnit(units).toUpperCase()}
            </TText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', paddingTop: 4 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: EYEBROW_SIZE }}>NO.</Eyebrow>
          <TText variant="mono" style={{ fontSize: 10, color: 'rgba(243,237,226,0.6)', marginTop: 2 }}>
            {run.id.slice(0, 6).toUpperCase()}
          </TText>
        </View>
      </View>

      {/* The giant postmark ring centred in the canvas */}
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <PostmarkRing
          width={width}
          height={height}
          city={run.city || run.title}
          country={(run.country || 'RUNSTAMP').toUpperCase()}
          date={`${run.day.toUpperCase()} · ${formatMonthDay(run.date)}`}
          pace={fmtPace(run.pace, units)}
          time={fmtTime(run.seconds)}
          accent={c.accent}
        />
      </View>

      {/* Run title + airmail stripe — bottom */}
      <View style={{ position: 'absolute', bottom: PAD.lg, left: PAD.lg, right: PAD.lg }}>
        <TText variant="serifItalic" style={{ fontSize: 15, color: 'rgba(243,237,226,0.78)', lineHeight: 18 }} numberOfLines={1}>
          {run.title}
        </TText>
        <View style={{ flexDirection: 'row', marginTop: 12, height: 3 }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? c.accent : '#f3ede2', opacity: 0.7 }} />
          ))}
        </View>
      </View>
    </View>
  );
}

interface PostmarkRingProps {
  width: number;
  height: number;
  city: string;
  country: string;
  date: string;
  pace: string;
  time: string;
  accent: string;
}

function PostmarkRing({ width, height, city, country, date, pace, time, accent }: PostmarkRingProps) {
  // Size the ring to occupy most of the canvas while leaving margin
  const size = Math.min(width, height) * 0.82;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = outerR - 14;
  const textR = outerR - 7;

  // Arc path IDs — unique per render but stable since they use size
  const topArcId = `pm-top-arc-${Math.round(size)}`;
  const bottomArcId = `pm-bot-arc-${Math.round(size)}`;

  // Top arc: city + country travel along the top semicircle (left → right)
  const topArcD = `M ${cx - textR} ${cy} A ${textR} ${textR} 0 0 1 ${cx + textR} ${cy}`;

  // Bottom arc: pace + time travel along the bottom semicircle (right → left
  // so text reads left-to-right along the bottom rim)
  const botArcD = `M ${cx + textR} ${cy} A ${textR} ${textR} 0 0 1 ${cx - textR} ${cy}`;

  const rimStroke = 'rgba(243,237,226,0.88)';
  const labelColor = 'rgba(243,237,226,0.82)';
  const dateColor = '#f3ede2';

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <Path id={topArcId} d={topArcD} />
        <Path id={bottomArcId} d={botArcD} />
      </Defs>

      {/* Outer dashed cancellation ring */}
      <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={rimStroke} strokeWidth={1.6} strokeDasharray="3 3" />

      {/* Inner solid ring */}
      <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={rimStroke} strokeWidth={1.1} />

      {/* Horizontal cancel bars — the classic postmark ink lines */}
      {[-1, 0, 1].map((offset) => (
        <Line
          key={offset}
          x1={cx - innerR * 0.88}
          y1={cy + offset * (innerR * 0.28)}
          x2={cx + innerR * 0.88}
          y2={cy + offset * (innerR * 0.28)}
          stroke={rimStroke}
          strokeWidth={offset === 0 ? 1.0 : 0.7}
          opacity={0.7}
        />
      ))}

      {/* Date wedge rectangle in the centre */}
      <Rect
        x={cx - innerR * 0.64}
        y={cy - innerR * 0.18}
        width={innerR * 1.28}
        height={innerR * 0.36}
        fill={accent}
        opacity={0.9}
        rx={2}
      />
      <SvgText
        x={cx}
        y={cy + innerR * 0.11}
        fontSize={Math.max(9, size * 0.055)}
        fill={dateColor}
        textAnchor="middle"
        fontFamily="JetBrainsMono_600SemiBold"
        letterSpacing={1.4}
      >
        {date}
      </SvgText>

      {/* City + country along the top arc */}
      <SvgText
        fill={labelColor}
        fontSize={Math.max(8, size * 0.05)}
        letterSpacing={2}
        fontFamily="JetBrainsMono_600SemiBold"
      >
        <TextPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          {`${city.toUpperCase()} · ${country}`}
        </TextPath>
      </SvgText>

      {/* Pace + time along the bottom arc */}
      <SvgText
        fill={labelColor}
        fontSize={Math.max(7, size * 0.042)}
        letterSpacing={1.6}
        fontFamily="JetBrainsMono_400Regular"
      >
        <TextPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          {`${pace}/km  ·  ${time}`}
        </TextPath>
      </SvgText>
    </Svg>
  );
}
