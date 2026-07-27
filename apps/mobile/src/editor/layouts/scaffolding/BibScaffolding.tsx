import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const SOLAR = '#e85d2f';

// Bib: a race bib panel pinned over the photo — corner holes with pin bars,
// solar sponsor strip along the top. Distance seeds in as the bib number.
export const BibScaffolding: Scaffolding = ({ width, height }) => {
  const px = width * 0.06;
  const py = height * 0.62;
  const pw = width * 0.88;
  const ph = height * 0.34;
  const holeR = Math.max(2.5, width * 0.011);
  const pins: [number, number][] = [
    [px + pw * 0.06, py + ph * 0.09],
    [px + pw * 0.94, py + ph * 0.09],
    [px + pw * 0.06, py + ph * 0.91],
    [px + pw * 0.94, py + ph * 0.91],
  ];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{ position: 'absolute', left: px, top: py, width: pw, height: ph, backgroundColor: PAPER, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(20,17,13,0.2)', overflow: 'hidden' }}>
        <View style={{ height: Math.max(3, height * 0.008), backgroundColor: SOLAR }} />
      </View>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {pins.map(([cx, cy], i) => (
          <React.Fragment key={i}>
            <Circle cx={cx} cy={cy} r={holeR} fill="none" stroke="rgba(20,17,13,0.4)" strokeWidth={1} />
            <Line x1={cx - holeR * 2} y1={cy + holeR * 1.6} x2={cx + holeR * 2} y2={cy - holeR * 1.6} stroke="rgba(20,17,13,0.5)" strokeWidth={1.4} strokeLinecap="round" />
          </React.Fragment>
        ))}
      </Svg>
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <RunstampMark tone="paper" opacity={0.5} />
      </View>
    </View>
  );
};
