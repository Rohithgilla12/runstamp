import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

// Polaroid: the Canvas photo layer owns the instant print; the paper below is
// the caption area for seeded stickers. Scaffolding adds only a ghosted
// postmark behind the caption corner and the mark.
export const PolaroidScaffolding: Scaffolding = ({ width, height }) => {
  const size = width * 0.24;
  const cx = size / 2;
  const outerR = cx - 2;
  const stroke = 'rgba(20,17,13,0.12)';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{ position: 'absolute', right: width * 0.07, bottom: height * 0.14, transform: [{ rotate: '8deg' }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={cx} cy={cx} r={outerR} fill="none" stroke={stroke} strokeWidth={1.2} strokeDasharray="2 2" />
          <Circle cx={cx} cy={cx} r={outerR - size * 0.1} fill="none" stroke={stroke} strokeWidth={0.9} />
          <Line x1={cx - outerR * 0.6} y1={cx} x2={cx + outerR * 0.6} y2={cx} stroke={stroke} strokeWidth={0.7} />
        </Svg>
      </View>
      <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' }}>
        <RunstampMark tone="ink" opacity={0.4} />
      </View>
    </View>
  );
};
