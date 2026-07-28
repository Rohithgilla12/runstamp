import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const INK = '#14110d';
const SOLAR = '#e85d2f';

// Tag: a luggage tag laid over the photo — punched hole with reinforcement
// ring, string trailing off the card, solar airline stripe at the right end.
export const TagScaffolding: Scaffolding = ({ width, height }) => {
  const tx = width * 0.08;
  const ty = height * 0.70;
  const tw = width * 0.64;
  const th = height * 0.245;
  const holeCx = tx + tw * 0.085;
  const holeCy = ty + th * 0.5;
  const holeR = Math.max(4, width * 0.016);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{ position: 'absolute', left: tx, top: ty, width: tw, height: th, backgroundColor: PAPER, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(20,17,13,0.25)' }}>
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: Math.max(4, width * 0.016), backgroundColor: SOLAR, borderTopRightRadius: 10, borderBottomRightRadius: 10 }} />
      </View>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Path
          d={`M ${holeCx} ${holeCy} C ${holeCx - width * 0.1} ${holeCy + height * 0.06}, ${width * 0.02} ${height * 0.9}, 0 ${height * 0.97}`}
          fill="none" stroke="rgba(243,237,226,0.75)" strokeWidth={1.6}
        />
        <Circle cx={holeCx} cy={holeCy} r={holeR} fill={INK} />
        <Circle cx={holeCx} cy={holeCy} r={holeR + 2.5} fill="none" stroke="rgba(20,17,13,0.45)" strokeWidth={1.6} />
      </Svg>
      <View style={{ position: 'absolute', top: 12, right: 12 }}>
        <RunstampMark tone="paper" opacity={0.5} />
      </View>
    </View>
  );
};
