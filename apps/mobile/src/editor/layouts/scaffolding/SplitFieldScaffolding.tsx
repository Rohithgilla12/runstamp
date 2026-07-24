import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { SPLIT_TOP_FRACTION } from '../../layers';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const INK = '#0e110d';

// Split field: perforated seam at the photo/map boundary (top 52%). Photo and
// map/route bands are composited by the Canvas layer engine in a later task.
export const SplitFieldScaffolding: Scaffolding = ({ width, height }) => {
  const seamY = height * SPLIT_TOP_FRACTION;
  const dots = Math.max(10, Math.round(width / 14));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{ position: 'absolute', top: seamY - 5, left: 0, right: 0, height: 10, backgroundColor: PAPER }} />
      <Svg width={width} height={10} style={{ position: 'absolute', top: seamY - 5, left: 0 }}>
        {Array.from({ length: dots }).map((_, i) => (
          <Circle key={i} cx={((i + 0.5) * width) / dots} cy={5} r={3.5} fill={INK} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
        <RunstampMark tone="ink" opacity={0.4} />
      </View>
    </View>
  );
};
