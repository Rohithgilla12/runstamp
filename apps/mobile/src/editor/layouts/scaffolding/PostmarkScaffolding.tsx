import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const INK = '#14110d';
const SOLAR = '#e85d2f';
const PAPER = '#f3ede2';

// Postmark: concentric ring system + horizontal cancel bars + thin baseline rule.
// No run text. Canvas owns the background.
export const PostmarkScaffolding: Scaffolding = ({ width, height }) => {
  const ringSize = Math.min(width, height) * 0.72;
  const ruleY = height * 0.12;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Thin baseline rule at ~12% from top */}
      <View style={{
        position: 'absolute', top: ruleY, left: 16, right: 16, height: 0.7,
        backgroundColor: 'rgba(20,17,13,0.18)',
      }} />

      {/* Concentric postmark ring system centred on canvas */}
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <PostmarkRings size={ringSize} />
      </View>

      {/* Air-mail stripe at bottom */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, flexDirection: 'row' }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? SOLAR : PAPER, opacity: 0.7 }} />
        ))}
      </View>
    </View>
  );
};

function PostmarkRings({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = outerR - 14;
  const rimStroke = 'rgba(20,17,13,0.75)';

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer dashed cancellation ring */}
      <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={rimStroke} strokeWidth={1.6} strokeDasharray="3 3" />
      {/* Inner solid ring */}
      <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={rimStroke} strokeWidth={1.1} />
      {/* Horizontal cancel bars */}
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
      {/* Empty date-wedge placeholder rect */}
      <Rect
        x={cx - innerR * 0.64}
        y={cy - innerR * 0.18}
        width={innerR * 1.28}
        height={innerR * 0.36}
        fill="none"
        stroke={rimStroke}
        strokeWidth={0.8}
        opacity={0.4}
        rx={2}
      />
    </Svg>
  );
}
