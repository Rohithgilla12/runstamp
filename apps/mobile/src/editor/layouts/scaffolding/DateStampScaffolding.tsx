import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const SOLAR = '#e85d2f';

// DateStamp: large rotated rubber-stamp ring (~180pt, center-right, -7°) +
// faint cross-hatch tint behind. No run text. Canvas owns the background.
export const DateStampScaffolding: Scaffolding = ({ width, height }) => {
  const ringSize = 180;
  const ringCx = width * 0.62;
  const ringCy = height * 0.50;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Cross-hatch tint — 8 scattered hairlines at low alpha */}
      <CrossHatch width={width} height={height} />

      {/* Stamp ring — positioned center-right, rotated -7° */}
      <View style={{
        position: 'absolute',
        top: ringCy - ringSize / 2,
        left: ringCx - ringSize / 2,
        width: ringSize,
        height: ringSize,
        transform: [{ rotate: '-7deg' }],
      }}>
        <StampRing size={ringSize} />
      </View>
    </View>
  );
};

function StampRing({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - 12;
  const stroke = `${SOLAR}CC`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer dashed ring */}
      <Rect
        x={2} y={2}
        width={size - 4} height={size - 4}
        rx={(size - 4) * 0.12}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeDasharray="4 3"
      />
      {/* Inner rect */}
      <Rect
        x={14} y={14}
        width={size - 28} height={size - 28}
        rx={(size - 28) * 0.10}
        fill="none"
        stroke={stroke}
        strokeWidth={0.9}
        opacity={0.6}
      />
      {/* Cancel bars across centre */}
      {[-1, 0, 1].map((offset) => (
        <Line
          key={offset}
          x1={cx - innerR * 0.75}
          y1={cy + offset * (innerR * 0.28)}
          x2={cx + innerR * 0.75}
          y2={cy + offset * (innerR * 0.28)}
          stroke={stroke}
          strokeWidth={0.7}
          opacity={0.45}
        />
      ))}
    </Svg>
  );
}

function CrossHatch({ width, height }: { width: number; height: number }) {
  const spacing = height / 9;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const y = spacing * i + spacing / 2;
    lines.push(
      <Line
        key={`h-${i}`}
        x1={0} y1={y} x2={width} y2={y}
        stroke="rgba(20,17,13,0.05)" strokeWidth={0.8}
      />,
    );
  }
  for (let i = 0; i < 7; i++) {
    const x = (width / 7) * i + width / 14;
    lines.push(
      <Line
        key={`v-${i}`}
        x1={x} y1={0} x2={x} y2={height}
        stroke="rgba(20,17,13,0.04)" strokeWidth={0.6}
      />,
    );
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {lines}
    </Svg>
  );
}
