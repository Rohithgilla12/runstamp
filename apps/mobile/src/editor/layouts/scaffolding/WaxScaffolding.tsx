import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const SOLAR = '#e85d2f';

// Wax seal: circular wax shape with raised emblem at bottom-center (~140pt)
// + faint radial ink-bloom backdrop tint. No run text. Canvas owns the background.
export const WaxScaffolding: Scaffolding = ({ width, height }) => {
  const sealSize = 140;
  const cx = width / 2;
  const sealTop = height - sealSize - 28;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Faint radial bloom behind the seal */}
      <View style={{
        position: 'absolute',
        top: sealTop - sealSize * 0.3,
        left: cx - sealSize * 0.8,
        width: sealSize * 1.6,
        height: sealSize * 1.6,
        borderRadius: sealSize * 0.8,
        backgroundColor: `${SOLAR}1a`,
      }} />

      {/* Wax seal SVG */}
      <View style={{ position: 'absolute', top: sealTop, left: cx - sealSize / 2 }}>
        <WaxSealSVG size={sealSize} />
      </View>
    </View>
  );
};

function WaxSealSVG({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const sealR = size / 2 - 4;
  const goldColor = '#c8a84b';
  const goldLight = '#e4c97a';

  const ribbonW = size * 0.055;
  const ribbonLen = sealR * 1.55;

  // 12 radial ribbon rects (deterministic angles)
  const ribbons = Array.from({ length: 12 }).map((_, i) => {
    const angleDeg = i * 30;
    const angleRad = (angleDeg * Math.PI) / 180;
    const pivotX = cx + Math.cos(angleRad) * (sealR - ribbonLen * 0.15);
    const pivotY = cy + Math.sin(angleRad) * (sealR - ribbonLen * 0.15);
    return { angleDeg, pivotX, pivotY, ribbonW, ribbonLen };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Radial ribbons behind seal */}
      {ribbons.map((r, i) => (
        <Rect
          key={i}
          x={r.pivotX - r.ribbonW / 2}
          y={r.pivotY - r.ribbonLen * 0.5}
          width={r.ribbonW}
          height={r.ribbonLen}
          rx={r.ribbonW * 0.25}
          fill={SOLAR}
          opacity={0.55}
          transform={`rotate(${r.angleDeg}, ${r.pivotX}, ${r.pivotY})`}
        />
      ))}

      {/* Gold glow rings */}
      <Circle cx={cx} cy={cy} r={sealR + 7} fill="none" stroke={goldColor} strokeWidth={1.2} opacity={0.25} />
      <Circle cx={cx} cy={cy} r={sealR + 4} fill="none" stroke={goldLight} strokeWidth={2.2} opacity={0.55} />
      <Circle cx={cx} cy={cy} r={sealR + 1} fill="none" stroke={goldColor} strokeWidth={0.7} opacity={0.35} />

      {/* Main wax disc */}
      <Circle cx={cx} cy={cy} r={sealR} fill={SOLAR} opacity={0.88} />

      {/* Inner concentric detail rings (emblem outline) */}
      <Circle cx={cx} cy={cy} r={sealR - 8} fill="none" stroke="rgba(243,237,226,0.22)" strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={sealR - 14} fill="none" stroke="rgba(243,237,226,0.12)" strokeWidth={0.5} strokeDasharray="2 3" />
    </Svg>
  );
}
