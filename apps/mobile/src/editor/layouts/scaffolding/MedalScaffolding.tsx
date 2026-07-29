import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const SOLAR = '#e85d2f';
const INK = '#14110d';

// Medal: a race medal hung over the photo — ribbon tails + concentric rings.
// Distance seeds into the disc; a paper caption band below holds the rest.
export const MedalScaffolding: Scaffolding = ({ width, height }) => {
  const cx = width * 0.5;
  const cy = height * 0.38;
  const r = Math.min(width, height) * 0.20;
  const ribbonTop = height * 0.02;
  const bandY = height * 0.72;
  const bandH = height * 0.24;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Path
          d={`M ${width * 0.28} ${ribbonTop} L ${cx - r * 0.18} ${cy - r * 0.92} L ${cx} ${cy - r * 0.55} Z`}
          fill={SOLAR} opacity={0.92}
        />
        <Path
          d={`M ${width * 0.72} ${ribbonTop} L ${cx + r * 0.18} ${cy - r * 0.92} L ${cx} ${cy - r * 0.55} Z`}
          fill={SOLAR} opacity={0.75}
        />
        <Circle cx={cx} cy={cy} r={r} fill={PAPER} />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={1.6} />
        <Circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke="rgba(20,17,13,0.25)" strokeWidth={1} />
        <Circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke={SOLAR} strokeWidth={1.8} />
        <Circle cx={cx} cy={cy - r * 0.92} r={Math.max(3, width * 0.012)} fill="none" stroke={INK} strokeWidth={1.4} />
      </Svg>
      <View style={{
        position: 'absolute', left: width * 0.05, top: bandY, width: width * 0.90, height: bandH,
        backgroundColor: PAPER, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(20,17,13,0.18)',
        overflow: 'hidden',
      }}>
        <View style={{ height: Math.max(3, height * 0.006), backgroundColor: SOLAR }} />
      </View>
      <View style={{ position: 'absolute', top: 10, left: 10 }}>
        <RunstampMark tone="paper" opacity={0.5} />
      </View>
    </View>
  );
};
