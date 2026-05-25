import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

// Passport: 5 horizontal hairline rules + 4 corner ornaments + empty ENTRY stamp octagon.
// No run text. Canvas owns the background.
export const PassportScaffolding: Scaffolding = ({ width, height }) => {
  const guideCount = 5;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Horizontal hairline rules */}
      {Array.from({ length: guideCount }).map((_, i) => {
        const y = (height * (i + 1)) / (guideCount + 1);
        return (
          <View
            key={i}
            style={{
              position: 'absolute', top: y, left: 16, right: 16, height: 0.6,
              backgroundColor: 'rgba(28,24,18,0.10)',
            }}
          />
        );
      })}

      {/* Four corner ornaments */}
      <CornerOrnaments width={width} height={height} />

      {/* Empty ENTRY stamp octagon — outline only, rotated -8° */}
      <View style={{
        position: 'absolute',
        top: height * 0.50 - height * 0.15,
        left: width * 0.35 - width * 0.15,
        width: width * 0.30,
        height: height * 0.30,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-8deg' }],
      }}>
        <OctagonOutline width={width * 0.30} height={height * 0.30} />
      </View>
    </View>
  );
};

function CornerOrnaments({ width, height }: { width: number; height: number }) {
  const size = 16;
  const inset = 18;
  const stroke = 'rgba(28,24,18,0.28)';
  const sw = 0.9;
  const corners = [
    { x: inset, y: inset },
    { x: width - inset - size, y: inset },
    { x: inset, y: height - inset - size },
    { x: width - inset - size, y: height - inset - size },
  ];

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {corners.map((c, i) => (
        <React.Fragment key={i}>
          <Rect x={c.x} y={c.y} width={size} height={size} fill="none" stroke={stroke} strokeWidth={sw} />
          <Line x1={c.x + size * 0.3} y1={c.y + size * 0.3} x2={c.x + size * 0.7} y2={c.y + size * 0.7} stroke={stroke} strokeWidth={0.6} opacity={0.5} />
          <Line x1={c.x + size * 0.7} y1={c.y + size * 0.3} x2={c.x + size * 0.3} y2={c.y + size * 0.7} stroke={stroke} strokeWidth={0.6} opacity={0.5} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

function OctagonOutline({ width, height }: { width: number; height: number }) {
  const cut = Math.min(width, height) * 0.18;
  const w = width;
  const h = height;
  const d = [
    `M ${cut} 0`,
    `L ${w - cut} 0`,
    `L ${w} ${cut}`,
    `L ${w} ${h - cut}`,
    `L ${w - cut} ${h}`,
    `L ${cut} ${h}`,
    `L 0 ${h - cut}`,
    `L 0 ${cut}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={d} fill="none" stroke="rgba(28,24,18,0.30)" strokeWidth={1.2} strokeDasharray="4 3" />
      <Circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.12} fill="none" stroke="rgba(28,24,18,0.15)" strokeWidth={0.7} />
    </Svg>
  );
}
