import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const INK = '#14110d';

// Boarding: header strip + underline, perforation divider, barcode bars, corner marks.
// No run text. Canvas owns the background.
export const BoardingScaffolding: Scaffolding = ({ width, height }) => {
  const headerH = 36;
  const dividerY = height * 0.60;
  const barcodeH = height * 0.12;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Header strip */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: headerH,
        backgroundColor: 'rgba(20,17,13,0.06)',
      }} />
      <View style={{
        position: 'absolute', top: headerH, left: 0, right: 0, height: 1,
        backgroundColor: 'rgba(20,17,13,0.22)',
      }} />

      {/* Four corner registration marks */}
      <CornerMarks width={width} height={height} />

      {/* Horizontal perforation divider at ~60% */}
      <PerforationRow y={dividerY} width={width} />

      {/* Barcode bars in bottom 12% */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: barcodeH,
        backgroundColor: 'rgba(20,17,13,0.04)',
      }}>
        <BarcodeStrip width={width} height={barcodeH} />
      </View>
    </View>
  );
};

function CornerMarks({ width, height }: { width: number; height: number }) {
  const arm = 10;
  const inset = 14;
  const stroke = 'rgba(20,17,13,0.40)';
  const sw = 1;
  const corners = [
    { x: inset, y: inset },
    { x: width - inset, y: inset },
    { x: inset, y: height - inset },
    { x: width - inset, y: height - inset },
  ];

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {corners.map((c, i) => {
        const dx = i % 2 === 0 ? 1 : -1;
        const dy = i < 2 ? 1 : -1;
        return (
          <React.Fragment key={i}>
            <Line x1={c.x} y1={c.y} x2={c.x + arm * dx} y2={c.y} stroke={stroke} strokeWidth={sw} />
            <Line x1={c.x} y1={c.y} x2={c.x} y2={c.y + arm * dy} stroke={stroke} strokeWidth={sw} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function PerforationRow({ y, width }: { y: number; width: number }) {
  const r = 3.5;
  const spacing = r * 3.2;
  const count = Math.floor(width / spacing);
  return (
    <Svg width={width} height={r * 2 + 2} style={{ position: 'absolute', top: y - r - 1, left: 0 }} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <Circle
          key={i}
          cx={((width - (count - 1) * spacing) / 2) + i * spacing}
          cy={r + 1}
          r={r}
          fill="rgba(20,17,13,0.08)"
          stroke="rgba(20,17,13,0.22)"
          strokeWidth={0.5}
        />
      ))}
    </Svg>
  );
}

function BarcodeStrip({ width, height }: { width: number; height: number }) {
  const barCount = 12;
  const totalPad = width * 0.15;
  const usable = width - totalPad * 2;
  const barW = usable / (barCount * 2 - 1);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {Array.from({ length: barCount }).map((_, i) => (
        <Rect
          key={i}
          x={totalPad + i * barW * 2}
          y={height * 0.15}
          width={barW}
          height={height * 0.7}
          fill={INK}
          opacity={0.35}
          rx={0.5}
        />
      ))}
    </Svg>
  );
}
