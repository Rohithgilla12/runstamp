import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const SOLAR = '#e85d2f';

// Postage: perforated outer ring + dashed inner frame + empty postmark
// rings + air-mail stripe + paper attribution. Stickers own all data slots.
export const PostageScaffolding: Scaffolding = ({ width, height }) => {
  const inset = 14;
  const cardW = width - inset * 2;
  const cardH = height - inset * 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{
        position: 'absolute', top: inset, left: inset, width: cardW, height: cardH,
        borderWidth: 1.2, borderColor: 'rgba(243,237,226,0.45)', borderStyle: 'dashed', borderRadius: 2,
      }} />

      <View style={{ position: 'absolute', bottom: inset + 14, right: inset + 14 }}>
        <PostmarkRings size={86} />
      </View>

      <View style={{ position: 'absolute', bottom: inset, left: inset, right: inset, height: 4, flexDirection: 'row' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? SOLAR : PAPER }} />
        ))}
      </View>

      <View style={{ position: 'absolute', bottom: inset + 8, left: 0, right: 0, alignItems: 'center' }}>
        <RunstampMark tone="paper" opacity={0.4} />
      </View>

      <PerforatedFrame width={width} height={height} inset={inset} paperColor={PAPER} />
    </View>
  );
};

function PostmarkRings({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = cx - 2;
  const innerR = outerR - 9;
  const stroke = 'rgba(243,237,226,0.85)';
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={stroke} strokeWidth={1.3} strokeDasharray="2 2" />
      <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={stroke} strokeWidth={0.9} />
      <Line x1={cx - innerR * 0.78} y1={cy - innerR * 0.32} x2={cx + innerR * 0.78} y2={cy - innerR * 0.32} stroke={stroke} strokeWidth={0.6} opacity={0.7} />
      <Line x1={cx - innerR * 0.78} y1={cy + innerR * 0.42} x2={cx + innerR * 0.78} y2={cy + innerR * 0.42} stroke={stroke} strokeWidth={0.6} opacity={0.55} />
    </Svg>
  );
}

function PerforatedFrame({ width, height, inset, paperColor }: { width: number; height: number; inset: number; paperColor: string }) {
  const notchR = Math.max(3, Math.round(inset * 0.45));
  const horizontalCount = Math.max(8, Math.round((width - inset * 2) / (notchR * 3.2)));
  const verticalCount = Math.max(10, Math.round((height - inset * 2) / (notchR * 3.2)));
  const notches: { cx: number; cy: number }[] = [];
  for (let i = 1; i < horizontalCount; i++) {
    const cx = inset + ((width - inset * 2) * i) / horizontalCount;
    notches.push({ cx, cy: inset }, { cx, cy: height - inset });
  }
  for (let i = 1; i < verticalCount; i++) {
    const cy = inset + ((height - inset * 2) * i) / verticalCount;
    notches.push({ cx: inset, cy }, { cx: width - inset, cy });
  }
  notches.push({ cx: inset, cy: inset }, { cx: width - inset, cy: inset }, { cx: inset, cy: height - inset }, { cx: width - inset, cy: height - inset });
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {notches.map((n, i) => (
        <Circle key={i} cx={n.cx} cy={n.cy} r={notchR} fill={paperColor} />
      ))}
    </Svg>
  );
}
