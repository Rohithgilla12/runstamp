import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, MONTHS_3, TONE, type Units } from './shared';
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

// DateStampTemplate (PRD §6.3)
//
// "Minimalist office-stamp typography, dated and dry." Imagine the kind of
// rectangular date-received stamp clerks slam onto envelopes — three lines
// of bold all-caps mono text inside a hand-cut rectangular border, slightly
// rotated so it looks ink-pressed rather than printed.
//
// The card sits on warm paper; the stamp itself is the only saturated thing.
// Pace + time + elevation read along a thin baseline rule below.
export function DateStampTemplate({ run, width, height, background, units = 'km', photoUri }: Props) {
  const c = useColors();

  const inkTone = TONE.inkDark;
  const paperTone = TONE.paperWarm;
  const stampInk = c.accentDeep;

  const [year, month, day] = run.date.split('-');
  const monLabel = MONTHS_3[(parseInt(month, 10) - 1) % 12] ?? '';

  // Slight tilt — the stamp wasn't applied perfectly straight.
  const tilt = -2.4;

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: paperTone, overflow: 'hidden' }}>
      {/* Background variants — paper stays paper; map/photo go faint. */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.07 }}>
          <RouteMap points={run.route} width={width} height={height} style="light" accent={c.accent} routeStrokeWidth={2} flat />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.5}
          fallback={
            <View style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 36 - 50, left: -20, width: width + 40,
                  height: 12, backgroundColor: 'rgba(28,24,18,0.03)', transform: [{ rotate: '-8deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.05 }} />
      )}

      {/* Top eyebrow — "RECEIVED" reads office-clerk dry. */}
      <View style={{ paddingTop: PAD.xl, paddingHorizontal: PAD.xl }}>
        <Eyebrow style={{ color: inkTone, opacity: 0.5, fontSize: EYEBROW_SIZE }}>RUN — RECEIVED</Eyebrow>
        <TText
          variant="serifItalic"
          style={{ fontSize: 16, color: inkTone, marginTop: 4, lineHeight: 20, opacity: 0.7 }}
          numberOfLines={2}
        >
          {run.title}
        </TText>
      </View>

      {/* The stamp block — rectangular, double-ruled, slightly tilted. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          transform: [{ rotate: `${tilt}deg` }],
          alignItems: 'center',
        }}>
          <StampRect width={width * 0.72} stampInk={stampInk}>
            <View style={{ paddingVertical: PAD.md, paddingHorizontal: PAD.lg, alignItems: 'center' }}>
              {/* Top line: city, ALL CAPS, letterspaced */}
              <TText
                variant="mono"
                style={{
                  fontSize: 12, color: stampInk, letterSpacing: 3,
                  opacity: 0.95,
                }}
              >
                {(run.city || 'RUNSTAMP').toUpperCase()}
              </TText>
              <View style={{ height: 0.7, backgroundColor: stampInk, opacity: 0.6, width: '90%', marginVertical: 6 }} />
              {/* Centre line: date — the headline of an office stamp */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <TText
                  variant="monoSemi"
                  style={{ fontSize: Math.min(width * 0.10, 36), color: stampInk, letterSpacing: 1, lineHeight: Math.min(width * 0.10, 36) }}
                >
                  {day} {monLabel} {year}
                </TText>
              </View>
              <View style={{ height: 0.7, backgroundColor: stampInk, opacity: 0.6, width: '90%', marginVertical: 6 }} />
              {/* Bottom line: distance reads as a serial */}
              <TText
                variant="mono"
                style={{ fontSize: 12, color: stampInk, letterSpacing: 3, opacity: 0.95 }}
              >
                {fmtDist(run.distance, units)} {distUnit(units).toUpperCase()}
              </TText>
            </View>
          </StampRect>
        </View>
      </View>

      {/* Baseline stats — thin rule + small mono columns. */}
      <View style={{
        paddingHorizontal: PAD.xl, paddingBottom: PAD.xl,
      }}>
        <View style={{ height: 0.7, backgroundColor: inkTone, opacity: 0.18, marginBottom: PAD.md }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Foot label="PACE" value={`${fmtPace(run.pace, units)}/${distUnit(units)}`} ink={inkTone} />
          <Foot label="TIME" value={fmtTime(run.seconds)} ink={inkTone} />
          <Foot label="ELEV" value={`${run.elev}m`} ink={inkTone} />
          {run.country ? <Foot label="REGION" value={run.country.toUpperCase()} ink={inkTone} /> : null}
        </View>
        <View style={{ marginTop: PAD.md, alignItems: 'center' }}>
          <RunstampMark tone="ink" opacity={0.4} />
        </View>
      </View>
    </View>
  );
}

function Foot({ label, value, ink }: { label: string; value: string; ink: string }) {
  return (
    <View>
      <Eyebrow style={{ color: ink, opacity: 0.4, fontSize: EYEBROW_SIZE }}>{label}</Eyebrow>
      <TText variant="mono" style={{ fontSize: 12, color: ink, opacity: 0.85, marginTop: 3, letterSpacing: -0.2 }}>
        {value}
      </TText>
    </View>
  );
}

function StampRect({ width, stampInk, children }: { width: number; stampInk: string; children: React.ReactNode }) {
  return (
    <View style={{ position: 'relative' }}>
      {/* Outer rect — bold ink stroke */}
      <Svg width={width} height={1} style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={1} fill={stampInk} />
      </Svg>
      <View style={{
        borderWidth: 2,
        borderColor: stampInk,
        // Inner subtle inset rule via padding + the wrapped content already has its own internal padding.
        position: 'relative',
      }}>
        <View style={{
          borderWidth: 0.8,
          borderColor: stampInk,
          margin: 4,
          opacity: 0.7,
        }}>
          {children}
        </View>
      </View>
    </View>
  );
}
