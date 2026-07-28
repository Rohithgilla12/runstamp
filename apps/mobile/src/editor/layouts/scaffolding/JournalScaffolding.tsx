import React from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { SPLIT_TOP_FRACTION } from '../../layers';
import { RunstampMark } from '../../../design/RunstampMark';

const SOLAR = '#e85d2f';

// Journal: photo taped into a field-notes page — washi strips over the photo
// corners, ruled lines and a solar margin rule below. Stats are the entries.
export const JournalScaffolding: Scaffolding = ({ width, height }) => {
  const bandTop = height * SPLIT_TOP_FRACTION;
  const tapeW = width * 0.24;
  const tapeH = Math.max(8, height * 0.028);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {[0.62, 0.68, 0.74, 0.8, 0.86, 0.92].map((frac) => (
          <Line key={frac} x1={width * 0.06} y1={height * frac} x2={width * 0.94} y2={height * frac} stroke="rgba(20,17,13,0.13)" strokeWidth={0.8} />
        ))}
        <Line x1={width * 0.135} y1={bandTop + height * 0.02} x2={width * 0.135} y2={height * 0.96} stroke={SOLAR} strokeWidth={1.2} opacity={0.55} />
      </Svg>
      {/* washi tape over the photo's top corners */}
      <View style={{ position: 'absolute', top: height * 0.015, left: -tapeW * 0.22, width: tapeW, height: tapeH, backgroundColor: 'rgba(243,237,226,0.55)', borderWidth: 0.5, borderColor: 'rgba(20,17,13,0.1)', transform: [{ rotate: '-32deg' }] }} />
      <View style={{ position: 'absolute', top: height * 0.015, right: -tapeW * 0.22, width: tapeW, height: tapeH, backgroundColor: 'rgba(243,237,226,0.55)', borderWidth: 0.5, borderColor: 'rgba(20,17,13,0.1)', transform: [{ rotate: '32deg' }] }} />
      <View style={{ position: 'absolute', bottom: 8, right: 12 }}>
        <RunstampMark tone="ink" opacity={0.4} />
      </View>
    </View>
  );
};
