import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const INK = '#14110d';

// Halftone: dot overlay across full canvas (3pt dots at ~7pt spacing, ink 20%
// alpha, denser at top) + 1px ink frame inset 10pt. No run text. Canvas owns
// the background.
export const HalftoneScaffolding: Scaffolding = ({ width, height }) => {
  const inset = 10;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Halftone dot field */}
      <HalftoneField width={width} height={height} />

      {/* 1px ink frame */}
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Rect
          x={inset} y={inset}
          width={width - inset * 2} height={height - inset * 2}
          fill="none"
          stroke={INK}
          strokeWidth={1}
          opacity={0.55}
        />
      </Svg>
    </View>
  );
};

function HalftoneField({ width, height }: { width: number; height: number }) {
  const cellSize = 8;
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  const dots: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    const yProgress = row / rows;
    const radius = (1 - yProgress) * 2.6 + 0.4;
    const opacity = (1 - yProgress) * 0.18 + 0.02;
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : cellSize / 2;
      const cx = col * cellSize + offsetX;
      const cy = row * cellSize + cellSize / 2;
      dots.push(
        <Circle key={`${row}-${col}`} cx={cx} cy={cy} r={radius} fill={INK} opacity={opacity} />,
      );
    }
  }

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <G>{dots}</G>
    </Svg>
  );
}
