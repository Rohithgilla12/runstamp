import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

// Customs: double outer border + 4 horizontal + 2 vertical hairlines forming
// form fields + empty RECEIVED stamp outline (rounded rect rotated -12°).
// No run text. Canvas owns the background.
export const CustomsScaffolding: Scaffolding = ({ width, height }) => {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Outer form double border */}
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Rect x={10} y={10} width={width - 20} height={height - 20} fill="none" stroke="rgba(28,24,18,0.22)" strokeWidth={1} />
        <Rect x={14} y={14} width={width - 28} height={height - 28} fill="none" stroke="rgba(28,24,18,0.10)" strokeWidth={0.6} />

        {/* 4 horizontal form-field rules */}
        {[0.28, 0.44, 0.60, 0.76].map((frac, i) => (
          <Line
            key={`h-${i}`}
            x1={18} y1={height * frac}
            x2={width - 18} y2={height * frac}
            stroke="rgba(28,24,18,0.14)"
            strokeWidth={0.7}
          />
        ))}

        {/* 2 vertical column dividers */}
        {[0.42, 0.72].map((frac, i) => (
          <Line
            key={`v-${i}`}
            x1={width * frac} y1={18}
            x2={width * frac} y2={height - 18}
            stroke="rgba(28,24,18,0.12)"
            strokeWidth={0.6}
          />
        ))}
      </Svg>

      {/* RECEIVED stamp ornament — rounded rect outline, no text, rotated -12° */}
      <View style={{
        position: 'absolute',
        bottom: height * 0.18,
        right: width * 0.08,
        width: width * 0.38,
        height: height * 0.12,
        transform: [{ rotate: '-12deg' }],
      }}>
        <Svg width={width * 0.38} height={height * 0.12} viewBox={`0 0 ${width * 0.38} ${height * 0.12}`}>
          <Rect
            x={1} y={1}
            width={width * 0.38 - 2}
            height={height * 0.12 - 2}
            fill="none"
            stroke="rgba(28,24,18,0.32)"
            strokeWidth={1.4}
            rx={3}
          />
          <Rect
            x={4} y={4}
            width={width * 0.38 - 8}
            height={height * 0.12 - 8}
            fill="none"
            stroke="rgba(28,24,18,0.15)"
            strokeWidth={0.7}
            rx={2}
          />
        </Svg>
      </View>
    </View>
  );
};
