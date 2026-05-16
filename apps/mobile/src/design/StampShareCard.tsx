import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { StampTier } from '../data/sample';
import type { CatalogStamp } from '../state/useStamps';
import { useColors } from './theme';
import { Eyebrow, TText } from './typography';
import { StampBadge } from './StampBadge';
import { SunMark } from './SunMark';
import { RunstampMark } from './RunstampMark';
import { formatLongDate } from './templates/shared';

interface Props {
  stamp: CatalogStamp;
  /** Optional context — city + distance + title from the linked activity. */
  activityCity?: string;
  activityDistanceKm?: number;
  activityTitle?: string;
  width: number;
  height: number;
}

// Postcard-style share artifact for a single earned stamp. Per PRD §6.6 each
// stamp is itself a small designed artifact that can be shared individually.
//
// The composition: tier-coloured ink plate (moss for Common, ink for Rare,
// foil-tinted black for Mythic) with concentric postmark rings as the
// background motif, a big StampBadge in the centre, "EARNED" eyebrow at the
// top, the stamp name in italic serif, the earn date, and an optional
// activity context line. Single solar pulse at the corner SunMark.
export function StampShareCard({
  stamp,
  activityCity,
  activityDistanceKm,
  activityTitle,
  width,
  height,
}: Props) {
  const c = useColors();
  const palette = paletteForTier(stamp.tier, c);
  const earnedLabel = stamp.earnedAt ? formatLongDate(stamp.earnedAt) : '';
  const badgeSize = Math.min(width * 0.45, 200);

  const ctxLine = (() => {
    const parts: string[] = [];
    if (activityDistanceKm && activityDistanceKm > 0) {
      parts.push(`${activityDistanceKm.toFixed(2)} km`);
    }
    if (activityCity) parts.push(activityCity);
    return parts.join(' · ');
  })();

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: palette.bg, overflow: 'hidden' }}>
      {/* Concentric postmark rings — the cancellation pattern as ambient texture */}
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id="stamp-share-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={palette.bg} stopOpacity={0} />
            <Stop offset="100%" stopColor={palette.bg} stopOpacity={0.85} />
          </LinearGradient>
        </Defs>
        {[0.32, 0.42, 0.52, 0.62, 0.72].map((r, i) => (
          <Circle
            key={i}
            cx={width / 2}
            cy={height * 0.48}
            r={width * r}
            fill="none"
            stroke={palette.ring}
            strokeWidth={i === 2 ? 1.4 : 0.7}
            strokeDasharray={i === 2 ? '3 3' : i === 0 ? undefined : '1 4'}
            opacity={0.35 - i * 0.05}
          />
        ))}
      </Svg>

      {/* Top header — tier eyebrow + EARNED */}
      <View style={{ paddingHorizontal: 28, paddingTop: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow style={{ color: palette.fgDim, fontSize: 10, letterSpacing: 2.2 }}>
            {stamp.tier.toUpperCase()} · EARNED
          </Eyebrow>
          <SunMark size={20} />
        </View>
        <View style={{ marginTop: 6, height: 1, backgroundColor: palette.fgDim, opacity: 0.35 }} />
      </View>

      {/* The badge — centred, sized to canvas */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <StampBadge
          id={`share-${stamp.id}`}
          name={stamp.name}
          tier={stamp.tier}
          earned
          size={badgeSize}
        />
      </View>

      {/* Name + date + activity context */}
      <View style={{ paddingHorizontal: 28, paddingBottom: 24 }}>
        <View style={{ height: 1, backgroundColor: palette.fgDim, opacity: 0.35, marginBottom: 14 }} />
        <TText
          variant="serifItalic"
          style={{
            fontSize: Math.min(width * 0.085, 32),
            color: palette.fg,
            lineHeight: Math.min(width * 0.10, 38),
            letterSpacing: -0.4,
          }}
          numberOfLines={2}
        >
          {stamp.name}
        </TText>
        {!!earnedLabel && (
          <TText
            variant="mono"
            style={{ fontSize: 11, color: palette.fgDim, marginTop: 4, letterSpacing: 1.5 }}
          >
            {earnedLabel.toUpperCase()}
          </TText>
        )}
        {!!ctxLine && (
          <TText
            variant="mono"
            style={{ fontSize: 11, color: palette.fgDim, marginTop: 4, letterSpacing: 1 }}
          >
            {ctxLine.toUpperCase()}
          </TText>
        )}
        {!!activityTitle && (
          <TText
            variant="serifItalic"
            style={{ fontSize: 13, color: palette.fg, opacity: 0.7, marginTop: 8, lineHeight: 16 }}
            numberOfLines={1}
          >
            {activityTitle}
          </TText>
        )}

        <View style={{ marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.ring, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <RunstampMark tone={palette.markTone} opacity={0.6} />
          <TText variant="mono" style={{ fontSize: 9, color: palette.fgDim, letterSpacing: 1.4 }}>
            STAMP · {stamp.id.toUpperCase()}
          </TText>
        </View>
      </View>
    </View>
  );
}

interface Palette {
  bg: string;
  fg: string;
  fgDim: string;
  ring: string;
  markTone: 'ink' | 'paper';
}

function paletteForTier(tier: StampTier, c: { accent: string; ink: string; moss: string; paper: string }): Palette {
  if (tier === 'mythic') {
    return {
      bg: '#1a1612',
      fg: '#f3e0a8',
      fgDim: 'rgba(243,224,168,0.65)',
      ring: 'rgba(243,224,168,0.18)',
      markTone: 'paper',
    };
  }
  if (tier === 'rare') {
    return {
      bg: c.ink,
      fg: '#f3ede2',
      fgDim: 'rgba(243,237,226,0.65)',
      ring: 'rgba(243,237,226,0.18)',
      markTone: 'paper',
    };
  }
  // common
  return {
    bg: c.moss,
    fg: '#f3ede2',
    fgDim: 'rgba(243,237,226,0.7)',
    ring: 'rgba(243,237,226,0.2)',
    markTone: 'paper',
  };
}
