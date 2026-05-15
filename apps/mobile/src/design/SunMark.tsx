import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { useColors } from './theme';

interface Props {
  size?: number;
  color?: string;
}

export function SunMark({ size = 20, color }: Props) {
  const c = useColors();
  const fill = color ?? c.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4.8} fill={fill} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 8;
        const x1 = 12 + Math.cos(a) * 7.2;
        const y1 = 12 + Math.sin(a) * 7.2;
        const x2 = 12 + Math.cos(a) * 10.5;
        const y2 = 12 + Math.sin(a) * 10.5;
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth={1.6} strokeLinecap="round" />;
      })}
    </Svg>
  );
}

// Postmark stamp ring — the "Runstamp" export mark.
// Used in onboarding and bottom of settings; will also be the watermark
// applied to exported share cards per PRD.
export function PostmarkMark({ size = 56, color, label = 'RUNSTAMP', date = 'MAY 17 26' }: Props & { label?: string; date?: string }) {
  const c = useColors();
  const fill = color ?? c.accent;
  const r = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={r} cy={r} r={r - 1} fill="none" stroke={fill} strokeWidth={1.5} strokeDasharray="2 2" />
      <Circle cx={r} cy={r} r={r - 6} fill="none" stroke={fill} strokeWidth={1.2} />
      <Line x1={r - r * 0.5} y1={r} x2={r + r * 0.5} y2={r} stroke={fill} strokeWidth={1} opacity={0.6} />
    </Svg>
  );
}
