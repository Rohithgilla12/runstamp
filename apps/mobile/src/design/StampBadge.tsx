import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText, TextPath } from 'react-native-svg';
import { useColors } from './theme';
import type { StampTier } from '@runstamp/shared-types';

interface Props {
  id: string;
  name: string;
  tier: StampTier;
  earned?: boolean;
  date?: string;
  size?: number;
}

// A single stamp rendered as a circular postmark badge.
// Earned stamps use the accent ink; locked stamps drop to greyscale with a dashed perimeter
// and a small lock glyph in the centre.
export function StampBadge({ id, name, tier, earned = false, date, size = 92 }: Props) {
  const c = useColors();
  const r = size / 2;
  const ringColor = !earned
    ? c.ink3
    : tier === 'mythic'
      ? c.accent
      : tier === 'rare'
        ? c.ink
        : c.moss;
  const fill = earned ? `${ringColor}14` : 'transparent';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`g-${id}`} cx="50%" cy="50%" r="60%">
            <Stop offset="0%"  stopColor={ringColor} stopOpacity={earned ? 0.18 : 0.04} />
            <Stop offset="100%" stopColor={ringColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 2} fill={`url(#g-${id})`} />
        {/* Outer cancellation ring */}
        <Circle
          cx={r}
          cy={r}
          r={r - 4}
          fill={fill}
          stroke={ringColor}
          strokeWidth={1.5}
          strokeDasharray={earned ? '2 0' : '3 3'}
        />
        {/* Inner ring */}
        <Circle cx={r} cy={r} r={r - 12} fill="none" stroke={ringColor} strokeWidth={0.8} opacity={0.6} />
        {/* Mythic foil ticks */}
        {tier === 'mythic' && earned &&
          Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 12;
            const inner = r - 6;
            const outer = r - 10;
            const x1 = r + Math.cos(angle) * outer;
            const y1 = r + Math.sin(angle) * outer;
            const x2 = r + Math.cos(angle) * inner;
            const y2 = r + Math.sin(angle) * inner;
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ringColor} strokeWidth={1.2} strokeLinecap="round" />;
          })}
        {/* Curved label around the rim */}
        <Defs>
          <Path id={`arc-${id}`} d={`M ${r - (r - 18)} ${r} A ${r - 18} ${r - 18} 0 1 1 ${r + (r - 18)} ${r}`} />
        </Defs>
        <SvgText
          fill={ringColor}
          fontSize={size < 80 ? 6 : 7}
          letterSpacing={1.2}
          fontWeight="600"
        >
          <TextPath href={`#arc-${id}`} startOffset="50%" textAnchor="middle">
            {tier.toUpperCase()} · RUNSTAMP
          </TextPath>
        </SvgText>
        {/* Center mark */}
        {earned ? (
          <G>
            <Path d={`M${r - 8} ${r + 4} L${r - 8} ${r - 4} L${r + 8} ${r - 4} L${r + 8} ${r + 4} Z`} fill={ringColor} opacity={0.85} />
            <SvgText x={r} y={r + 2} fontSize={size < 80 ? 7 : 8.5} fill={c.paper} textAnchor="middle" fontWeight="700">
              EARNED
            </SvgText>
          </G>
        ) : (
          <G>
            <Circle cx={r} cy={r - 2} r={size < 80 ? 4.5 : 5.5} fill="none" stroke={ringColor} strokeWidth={1.2} />
            <Path d={`M${r - 3} ${r + 4} L${r + 3} ${r + 4} L${r + 3} ${r + 8} L${r - 3} ${r + 8} Z`} fill="none" stroke={ringColor} strokeWidth={1.2} />
          </G>
        )}
      </Svg>
    </View>
  );
}
