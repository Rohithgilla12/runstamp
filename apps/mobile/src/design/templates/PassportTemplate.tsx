import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Rect, Text as SvgText, TextPath } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { PostmarkMark } from '../SunMark';
import { EYEBROW_SIZE, type Units } from './shared';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
}

// PassportTemplate
//
// Renders a passport entry-page aesthetic from PRD §6.3.
// Two rows of monospaced machine-readable zone (MRZ) text at the bottom,
// derived deterministically from run fields. A bold "ENTRY" serif mark on
// the left, distance + pace stacked on the right, faint horizontal guide
// rules across the mid section like a real biometric page.
// Bottom-right stamp zone uses PostmarkMark from SunMark.
export function PassportTemplate({ run, width, height, background, units = 'km' }: Props) {
  const c = useColors();

  // Warm paper tones — passport pages are off-white / ecru
  const paperTone = '#f5eedf';
  const inkTone = '#1c1812';
  const stampColor = c.accentDeep;

  const mrzLines = buildMRZ(run);
  const guideCount = 9;

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: paperTone, overflow: 'hidden' }}>

      {/* Subtle warm-paper base */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: paperTone }} />

      {/* Background overlay at low opacity */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.10 }}>
          <RouteMap points={run.route} width={width} height={height} style="light" accent={c.accent} routeStrokeWidth={2} flat />
        </View>
      )}
      {background === 'photo' && (
        <View style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} style={{
              position: 'absolute', top: i * 30 - 60, left: -20, width: width + 40,
              height: 10, backgroundColor: 'rgba(28,24,18,0.03)', transform: [{ rotate: '-8deg' }]
            }} />
          ))}
        </View>
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.07 }} />
      )}

      {/* Faint horizontal guide rules — the biometric page grid */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: guideCount }).map((_, i) => {
          const y = (height * (i + 1)) / (guideCount + 1);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: y,
                left: 16,
                right: 16,
                height: 0.6,
                backgroundColor: 'rgba(28,24,18,0.10)'
              }}
            />
          );
        })}
      </View>

      {/* Top header strip — passport issuer line */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
        borderBottomWidth: 0.8, borderBottomColor: 'rgba(28,24,18,0.15)'
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>
              REPUBLIC OF RUNNING
            </Eyebrow>
            <TText variant="serif" style={{ fontSize: 13, color: inkTone, lineHeight: 16, marginTop: 2, letterSpacing: 0.3 }}>
              {run.country.toUpperCase()}
            </TText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>ISSUED</Eyebrow>
            <TText variant="mono" style={{ fontSize: 10, color: inkTone, marginTop: 2 }}>
              {formatPassportDate(run.date)}
            </TText>
          </View>
        </View>
      </View>

      {/* Main body — ENTRY mark + stats */}
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>

        {/* Left: large ENTRY mark in italic serif */}
        <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 4 }}>
          <TText
            variant="serifItalic"
            style={{
              fontSize: Math.min(width * 0.16, 58),
              color: stampColor,
              lineHeight: Math.min(width * 0.16, 58) * 1.05,
              letterSpacing: -1,
              opacity: 0.92
            }}
          >
            ENTRY
          </TText>
          <View style={{ marginTop: 10 }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>CITY OF ENTRY</Eyebrow>
            <TText variant="serif" style={{ fontSize: 15, color: inkTone, marginTop: 2 }}>
              {run.city}
            </TText>
          </View>
          <View style={{ marginTop: 10 }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>RUN TITLE</Eyebrow>
            <TText
              variant="serifItalic"
              style={{ fontSize: 12, color: inkTone, lineHeight: 15, marginTop: 2, opacity: 0.75 }}
              numberOfLines={2}
            >
              {run.title}
            </TText>
          </View>
        </View>

        {/* Vertical separator */}
        <View style={{ width: 0.8, backgroundColor: 'rgba(28,24,18,0.12)', marginHorizontal: 14, alignSelf: 'stretch' }} />

        {/* Right: Distance + Pace stacked */}
        <View style={{ width: width * 0.36, justifyContent: 'flex-start', alignItems: 'flex-end' }}>
          <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>DISTANCE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
              <TText
                variant="monoSemi"
                style={{
                  fontSize: Math.min(width * 0.12, 42),
                  color: inkTone,
                  letterSpacing: -1,
                  lineHeight: Math.min(width * 0.12, 42)
                }}
              >
                {fmtDist(run.distance, units)}
              </TText>
              <TText variant="mono" style={{ fontSize: 10, color: 'rgba(28,24,18,0.5)', marginLeft: 3 }}>{distUnit(units)}</TText>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>AVG PACE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
              <TText variant="monoSemi" style={{ fontSize: Math.min(width * 0.07, 26), color: inkTone, letterSpacing: -0.5, lineHeight: Math.min(width * 0.07, 26) }}>
                {fmtPace(run.pace, units)}
              </TText>
              <TText variant="mono" style={{ fontSize: 8, color: 'rgba(28,24,18,0.5)', marginLeft: 2 }}>/{distUnit(units)}</TText>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: EYEBROW_SIZE }}>DURATION</Eyebrow>
            <TText variant="mono" style={{ fontSize: Math.min(width * 0.055, 20), color: inkTone, letterSpacing: -0.3, marginTop: 3 }}>
              {fmtTime(run.seconds)}
            </TText>
          </View>
        </View>
      </View>

      {/* Stamp zone — bottom right */}
      <View style={{ position: 'absolute', bottom: 52, right: 18, alignItems: 'center' }}>
        <PassportStampCircle
          size={Math.min(width * 0.28, 96)}
          city={run.city.toUpperCase()}
          date={formatStampDate(run.date)}
          distance={fmtDist(run.distance, units)}
          unitLabel={distUnit(units).toUpperCase()}
          stampColor={stampColor}
        />
      </View>

      {/* MRZ zone — bottom strip */}
      <MRZZone lines={mrzLines} width={width} inkTone={inkTone} />
    </View>
  );
}

function formatPassportDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const m = months[(parseInt(month, 10) - 1) % 12];
  return `${day} ${m} ${year}`;
}

function formatStampDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const m = months[(parseInt(month, 10) - 1) % 12];
  return `${day} ${m} ${year.slice(2)}`;
}

// Builds two MRZ rows deterministically from run fields.
// Format: TD1-inspired — city padded/truncated to 3, distance digits, filler.
function buildMRZ(run: Activity): [string, string] {
  const pad = (s: string, n: number, fill = '<') =>
    s.length >= n ? s.slice(0, n) : s + fill.repeat(n - s.length);
  const clean = (s: string) =>
    s.toUpperCase().replace(/[^A-Z0-9]/g, '<');

  const city = pad(clean(run.city), 9);
  const country = pad(clean(run.country.slice(0, 3)), 3);
  const id = pad(clean(run.id.slice(0, 8)), 8);
  const dist = run.distance.toFixed(2).replace('.', '').padStart(5, '0');
  const dateStr = run.date.replace(/-/g, '').slice(2); // YYMMDD
  const pace = String(run.pace).padStart(4, '0');

  const row1 = `P<${country}${city}<<<${id}${dist}`;
  const row2 = `${dateStr}${pace}<<${city.slice(0, 5)}<<<<<<<<`;

  const lineLen = 44;
  const r1 = pad(row1.slice(0, lineLen), lineLen);
  const r2 = pad(row2.slice(0, lineLen), lineLen);
  return [r1, r2];
}

interface MRZZoneProps {
  lines: [string, string];
  width: number;
  inkTone: string;
}

function MRZZone({ lines, width, inkTone }: MRZZoneProps) {
  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 50,
      backgroundColor: 'rgba(28,24,18,0.04)',
      borderTopWidth: 0.8,
      borderTopColor: 'rgba(28,24,18,0.18)',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      gap: 3
    }}>
      {lines.map((line, i) => (
        <TText
          key={i}
          variant="mono"
          style={{
            fontSize: Math.min(width * 0.028, 10),
            color: inkTone,
            opacity: 0.55,
            letterSpacing: 1.2,
            lineHeight: Math.min(width * 0.028, 10) * 1.4
          }}
          numberOfLines={1}
        >
          {line}
        </TText>
      ))}
    </View>
  );
}

interface PassportStampCircleProps {
  size: number;
  city: string;
  date: string;
  distance: string;
  unitLabel: string;
  stampColor: string;
}

function PassportStampCircle({ size, city, date, distance, unitLabel, stampColor }: PassportStampCircleProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - 10;
  const textR = outerR - 5;

  const arcId = `passport-arc-${Math.round(size)}`;
  const arcD = `M ${cx - textR} ${cy} A ${textR} ${textR} 0 0 1 ${cx + textR} ${cy}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <Path id={arcId} d={arcD} />
      </Defs>

      {/* Outer dashed ring */}
      <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={stampColor} strokeWidth={1.2} strokeDasharray="2 2" />
      {/* Inner solid ring */}
      <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={stampColor} strokeWidth={0.8} />

      {/* City curved along top arc */}
      <SvgText
        fill={stampColor}
        fontSize={Math.max(7, size * 0.09)}
        letterSpacing={1.8}
        fontFamily="JetBrainsMono_600SemiBold"
      >
        <TextPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {city.slice(0, 12)}
        </TextPath>
      </SvgText>

      {/* Distance in centre */}
      <SvgText
        x={cx}
        y={cy + size * 0.06}
        fontSize={Math.max(10, size * 0.14)}
        fill={stampColor}
        textAnchor="middle"
        fontFamily="JetBrainsMono_600SemiBold"
        letterSpacing={-0.5}
      >
        {distance}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + size * 0.17}
        fontSize={Math.max(6, size * 0.07)}
        fill={stampColor}
        textAnchor="middle"
        fontFamily="JetBrainsMono_400Regular"
        opacity={0.75}
      >
        {unitLabel}
      </SvgText>

      {/* Date at the bottom */}
      <SvgText
        x={cx}
        y={cy + size * 0.32}
        fontSize={Math.max(6, size * 0.075)}
        fill={stampColor}
        textAnchor="middle"
        fontFamily="JetBrainsMono_400Regular"
        opacity={0.8}
      >
        {date}
      </SvgText>
    </Svg>
  );
}
