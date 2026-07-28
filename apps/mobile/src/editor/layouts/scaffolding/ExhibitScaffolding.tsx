import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const MAT = 24;
const SOLAR = '#e85d2f';

// Exhibit: gallery print in a wide paper mat — an ink hairline traces the
// print edge and a solar "sold" dot sits in the mat. Caption stats live over
// the photo's foot on the scrim.
export const ExhibitScaffolding: Scaffolding = ({ width, height }) => {
  const dotR = Math.max(2.5, width * 0.011);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Rect x={MAT - 5} y={MAT - 5} width={width - (MAT - 5) * 2} height={height - (MAT - 5) * 2} fill="none" stroke="rgba(20,17,13,0.35)" strokeWidth={1} />
        <Circle cx={width * 0.08} cy={height - MAT / 2} r={dotR} fill={SOLAR} />
      </Svg>
      <View style={{ position: 'absolute', bottom: (MAT - 10) / 2, right: MAT, alignItems: 'flex-end' }}>
        <RunstampMark tone="ink" opacity={0.45} />
      </View>
    </View>
  );
};
