import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { TText } from '../../../design/typography';
import { RunstampMark } from '../../../design/RunstampMark';

const INK = '#14110d';
const SOLAR = '#e85d2f';

// Film: 35mm sprocket rails down both edges over the full-bleed photo, with
// solar stock markings along the left rail. Stats live between the rails.
export const FilmScaffolding: Scaffolding = ({ width, height }) => {
  const rail = Math.max(14, width * 0.085);
  const holeW = rail * 0.52;
  const holeH = holeW * 0.78;
  const count = Math.max(8, Math.round(height / (holeH * 2.6)));
  const holes = Array.from({ length: count }, (_, i) => (i + 0.5) * (height / count) - holeH / 2);
  const markSize = Math.max(4, width * 0.022);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Rect x={0} y={0} width={rail} height={height} fill={INK} />
        <Rect x={width - rail} y={0} width={rail} height={height} fill={INK} />
        {holes.map((y, i) => (
          <React.Fragment key={i}>
            <Rect x={(rail - holeW) / 2} y={y} width={holeW} height={holeH} rx={holeW * 0.22} fill="rgba(243,237,226,0.9)" />
            <Rect x={width - rail + (rail - holeW) / 2} y={y} width={holeW} height={holeH} rx={holeW * 0.22} fill="rgba(243,237,226,0.9)" />
          </React.Fragment>
        ))}
      </Svg>
      <EdgeMark text="RUNSTAMP 400" size={markSize} cx={rail + markSize} cy={height * 0.45} />
      <EdgeMark text="26A" size={markSize} cx={width - rail - markSize} cy={height * 0.88} />
      <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' }}>
        <RunstampMark tone="paper" opacity={0.4} />
      </View>
    </View>
  );
};

// Vertical stock marking centred on (cx, cy) — fixed box so the 90° rotation
// pivots around the intended point.
function EdgeMark({ text, size, cx, cy }: { text: string; size: number; cx: number; cy: number }) {
  const w = size * (text.length * 0.85 + 2);
  return (
    <View style={{ position: 'absolute', left: cx - w / 2, top: cy - size, width: w, alignItems: 'center', transform: [{ rotate: '90deg' }] }}>
      <TText variant="mono" style={{ fontSize: size, color: SOLAR, letterSpacing: size * 0.3 }}>{text}</TText>
    </View>
  );
}
