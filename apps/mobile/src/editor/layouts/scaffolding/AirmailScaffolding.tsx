import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { TText } from '../../../design/typography';
import { RunstampMark } from '../../../design/RunstampMark';

const INK = '#14110d';
const SOLAR = '#e85d2f';
const BORDER = 18;

// Airmail: the classic diagonal-stripe border drawn in the paper margin around
// the contained photo (frame inset matches BORDER), plus a PAR AVION mark.
export const AirmailScaffolding: Scaffolding = ({ width, height }) => {
  const tagSize = Math.max(4, width * 0.024);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <StripeBar x={0} y={0} length={width} thickness={BORDER} />
      <StripeBar x={0} y={height - BORDER} length={width} thickness={BORDER} />
      <StripeBar x={0} y={BORDER} length={height - BORDER * 2} thickness={BORDER} vertical />
      <StripeBar x={width - BORDER} y={BORDER} length={height - BORDER * 2} thickness={BORDER} vertical />
      <View style={{ position: 'absolute', top: BORDER + height * 0.025, left: BORDER + width * 0.04 }}>
        <TText variant="mono" style={{ fontSize: tagSize, color: 'rgba(243,237,226,0.85)', letterSpacing: tagSize * 0.3 }}>
          PAR AVION · BY AIR MAIL
        </TText>
      </View>
      <View style={{ position: 'absolute', bottom: BORDER + 8, left: 0, right: 0, alignItems: 'center' }}>
        <RunstampMark tone="paper" opacity={0.45} />
      </View>
    </View>
  );
};

// One edge of the border: 45° parallelograms alternating solar/ink with paper
// gaps between, clipped to the bar by the overflow-hidden wrapper.
function StripeBar({ x, y, length, thickness, vertical }: { x: number; y: number; length: number; thickness: number; vertical?: boolean }) {
  const seg = Math.max(6, length * 0.024);
  const step = seg * 2;
  const count = Math.ceil((length + thickness) / step) + 1;
  const stripes = Array.from({ length: count }, (_, i) => {
    const s = i * step - thickness;
    const pts = vertical
      ? `0,${s} ${thickness},${s - thickness} ${thickness},${s - thickness + seg} 0,${s + seg}`
      : `${s},${thickness} ${s + thickness},0 ${s + thickness + seg},0 ${s + seg},${thickness}`;
    return { pts, color: i % 2 === 0 ? SOLAR : INK };
  });
  const w = vertical ? thickness : length;
  const h = vertical ? length : thickness;
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden' }}>
      <Svg width={w} height={h}>
        {stripes.map((st, i) => (
          <Polygon key={i} points={st.pts} fill={st.color} />
        ))}
      </Svg>
    </View>
  );
}
