import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const SOLAR = '#e85d2f';
const INK = '#14110d';

// Ribbon: a finish-line tape stretched across the photo. Stats seed onto the
// tape; the photo and route stay visible above and below the band.
export const RibbonScaffolding: Scaffolding = ({ width, height }) => {
  const bandY = height * 0.62;
  const bandH = height * 0.22;
  const notch = Math.max(10, width * 0.045);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Slight tilt so the tape reads as stretched, not printed. */}
        <Rect
          x={-width * 0.04}
          y={bandY}
          width={width * 1.08}
          height={bandH}
          fill={PAPER}
          transform={`rotate(-2 ${width / 2} ${bandY + bandH / 2})`}
        />
        {/* Swallowtail notches on both ends. */}
        <Path
          d={`M 0 ${bandY} L ${notch} ${bandY + bandH / 2} L 0 ${bandY + bandH} Z`}
          fill={INK}
          transform={`rotate(-2 ${width / 2} ${bandY + bandH / 2})`}
        />
        <Path
          d={`M ${width} ${bandY} L ${width - notch} ${bandY + bandH / 2} L ${width} ${bandY + bandH} Z`}
          fill={INK}
          transform={`rotate(-2 ${width / 2} ${bandY + bandH / 2})`}
        />
        {/* Solar stripe along the tape top edge. */}
        <Rect
          x={-width * 0.04}
          y={bandY}
          width={width * 1.08}
          height={Math.max(3, height * 0.006)}
          fill={SOLAR}
          transform={`rotate(-2 ${width / 2} ${bandY + bandH / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <RunstampMark tone="paper" opacity={0.45} />
      </View>
    </View>
  );
};
