import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { Scaffolding } from '../types';

const SOLAR = '#e85d2f';
const PAPER = '#f3ede2';

// Postmark: a cream cancellation mark struck over a dark field — concentric
// rings + wavy cancel lines trailing off one side, like an ink stamp on a
// letter. Strokes are cream to read on the ink backdrop. Canvas owns the bg;
// the distance sticker sits in the ring's centre via the layout seed.
export const PostmarkScaffolding: Scaffolding = ({ width, height }) => {
  const ringSize = Math.min(width, height) * 0.62;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Wavy cancellation lines trailing to the right of the postmark. */}
      <CancellationWaves width={width} height={height} />

      {/* Concentric postmark ring system, struck slightly above centre. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.62, alignItems: 'center', justifyContent: 'center' }}>
        <PostmarkRings size={ringSize} />
      </View>

      {/* Air-mail stripe at bottom. */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, flexDirection: 'row' }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? SOLAR : PAPER, opacity: 0.7 }} />
        ))}
      </View>
    </View>
  );
};

const RIM = 'rgba(243,237,226,0.82)';

function CancellationWaves({ width, height }: { width: number; height: number }) {
  const y0 = height * 0.31;
  const amp = 5;
  const startX = width * 0.52;
  const lines = [0, 1, 2, 3, 4];
  const seg = (cy: number) => {
    let d = `M${startX} ${cy}`;
    for (let x = startX; x < width - 8; x += 16) {
      d += ` Q${x + 8} ${cy - amp} ${x + 16} ${cy}`;
    }
    return d;
  };
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      {lines.map((i) => (
        <Path key={i} d={seg(y0 + i * 7)} fill="none" stroke={RIM} strokeWidth={1} opacity={0.5} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

function PostmarkRings({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = outerR - 12;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer dashed cancellation ring. */}
      <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={RIM} strokeWidth={1.8} strokeDasharray="3 3" />
      {/* Inner solid ring. */}
      <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={RIM} strokeWidth={1.2} />
      {/* Top + bottom arcs label tracks (where city/date would curve). */}
      <Line x1={cx - innerR * 0.86} y1={cy - innerR * 0.5} x2={cx + innerR * 0.86} y2={cy - innerR * 0.5} stroke={RIM} strokeWidth={0.7} opacity={0.6} />
      <Line x1={cx - innerR * 0.86} y1={cy + innerR * 0.5} x2={cx + innerR * 0.86} y2={cy + innerR * 0.5} stroke={RIM} strokeWidth={0.7} opacity={0.6} />
    </Svg>
  );
}
