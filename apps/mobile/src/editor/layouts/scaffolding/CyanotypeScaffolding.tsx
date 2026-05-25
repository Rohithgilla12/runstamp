import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { Scaffolding } from '../types';

const CREAM = '#f0e6cd';

// Cyanotype: tint overlay (rgba(20,80,140,0.65)) + 4 botanical leaf/fern
// silhouettes at the four corners. No run text. Canvas owns the background.
export const CyanotypeScaffolding: Scaffolding = ({ width, height }) => {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Cyanotype blue tint overlay */}
      <View style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(20,80,140,0.65)',
      }} />

      {/* Botanical silhouettes in each corner */}
      <BotanicalCorners width={width} height={height} />
    </View>
  );
};

function BotanicalCorners({ width, height }: { width: number; height: number }) {
  const leafSize = Math.min(width, height) * 0.30;

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {/* Top-left fern — upright */}
      <G transform={`translate(0, 0)`}>
        <FernPath size={leafSize} fill={CREAM} opacity={0.18} />
      </G>
      {/* Top-right fern — mirrored horizontally */}
      <G transform={`translate(${width}, 0) scale(-1, 1)`}>
        <FernPath size={leafSize} fill={CREAM} opacity={0.14} />
      </G>
      {/* Bottom-left fern — mirrored vertically */}
      <G transform={`translate(0, ${height}) scale(1, -1)`}>
        <FernPath size={leafSize} fill={CREAM} opacity={0.16} />
      </G>
      {/* Bottom-right fern — mirrored both axes */}
      <G transform={`translate(${width}, ${height}) scale(-1, -1)`}>
        <FernPath size={leafSize} fill={CREAM} opacity={0.12} />
      </G>
    </Svg>
  );
}

interface FernPathProps {
  size: number;
  fill: string;
  opacity: number;
}

function FernPath({ size, fill, opacity }: FernPathProps) {
  const s = size;
  // Simple stylised fern frond built from bezier curves — no text, no data
  const d = [
    `M ${s * 0.05} ${s * 0.95}`,
    `C ${s * 0.10} ${s * 0.70} ${s * 0.08} ${s * 0.40} ${s * 0.18} ${s * 0.10}`,
    `C ${s * 0.22} ${s * 0.30} ${s * 0.35} ${s * 0.28} ${s * 0.40} ${s * 0.15}`,
    `C ${s * 0.32} ${s * 0.38} ${s * 0.28} ${s * 0.55} ${s * 0.22} ${s * 0.62}`,
    `C ${s * 0.30} ${s * 0.55} ${s * 0.45} ${s * 0.50} ${s * 0.52} ${s * 0.38}`,
    `C ${s * 0.42} ${s * 0.52} ${s * 0.36} ${s * 0.68} ${s * 0.28} ${s * 0.75}`,
    `C ${s * 0.38} ${s * 0.65} ${s * 0.55} ${s * 0.62} ${s * 0.60} ${s * 0.52}`,
    `C ${s * 0.50} ${s * 0.68} ${s * 0.38} ${s * 0.82} ${s * 0.20} ${s * 0.92}`,
    `Z`,
  ].join(' ');

  // Second frond beside the first
  const d2 = [
    `M ${s * 0.12} ${s * 0.98}`,
    `C ${s * 0.20} ${s * 0.78} ${s * 0.15} ${s * 0.55} ${s * 0.28} ${s * 0.35}`,
    `C ${s * 0.34} ${s * 0.50} ${s * 0.46} ${s * 0.48} ${s * 0.52} ${s * 0.36}`,
    `C ${s * 0.44} ${s * 0.55} ${s * 0.38} ${s * 0.70} ${s * 0.30} ${s * 0.80}`,
    `C ${s * 0.40} ${s * 0.72} ${s * 0.55} ${s * 0.68} ${s * 0.60} ${s * 0.60}`,
    `C ${s * 0.50} ${s * 0.75} ${s * 0.35} ${s * 0.88} ${s * 0.18} ${s * 0.96}`,
    `Z`,
  ].join(' ');

  return (
    <>
      <Path d={d} fill={fill} opacity={opacity} />
      <Path d={d2} fill={fill} opacity={opacity * 0.7} />
    </>
  );
}
