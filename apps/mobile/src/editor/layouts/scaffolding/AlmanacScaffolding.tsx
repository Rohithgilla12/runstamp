import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { SPLIT_TOP_FRACTION } from '../../layers';
import { TText } from '../../../design/typography';
import { RunstampMark } from '../../../design/RunstampMark';

const SOLAR = '#e85d2f';
const INK = '#14110d';

// Almanac: photo in the upper band, ruled ephemeris page below — like a
// runner's day torn from a field almanac. Date + distance seed as the entry.
export const AlmanacScaffolding: Scaffolding = ({ width, height }) => {
  const seam = height * SPLIT_TOP_FRACTION;
  const rules = [0.58, 0.66, 0.74, 0.82, 0.90];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{ position: 'absolute', top: seam, left: 0, bottom: 0, width: Math.max(10, width * 0.04), backgroundColor: 'rgba(20,17,13,0.06)' }} />
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Line x1={0} y1={seam} x2={width} y2={seam} stroke="rgba(20,17,13,0.35)" strokeWidth={1} />
        <Line x1={width * 0.14} y1={seam + 8} x2={width * 0.14} y2={height * 0.96} stroke={SOLAR} strokeWidth={1.2} opacity={0.55} />
        {rules.map((frac) => (
          <Line
            key={frac}
            x1={width * 0.14}
            y1={height * frac}
            x2={width * 0.94}
            y2={height * frac}
            stroke="rgba(20,17,13,0.14)"
            strokeWidth={0.8}
          />
        ))}
        <Rect x={width * 0.82} y={height * 0.545} width={width * 0.12} height={height * 0.028} fill="none" stroke="rgba(20,17,13,0.3)" strokeWidth={0.8} />
      </Svg>
      <View style={{ position: 'absolute', top: height * 0.548, left: width * 0.84, width: width * 0.1, alignItems: 'center' }}>
        <TText variant="mono" style={{ fontSize: Math.max(7, width * 0.022), color: INK, letterSpacing: 1 }}>DAY</TText>
      </View>
      <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(20,17,13,0.35)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 2 }}>
        <RunstampMark tone="paper" opacity={0.7} />
      </View>
    </View>
  );
};
