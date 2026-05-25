import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const PINK = '#ff5b8a';
const BLUE = '#2a4fb5';

// Riso: grain speckle overlay + two dual-pass overprint marks (top-left) +
// four corner trim/crop ticks. No run text. Canvas owns the background.
export const RisoScaffolding: Scaffolding = ({ width, height }) => {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Riso grain speckle */}
      <RisoGrain width={width} height={height} />

      {/* Overprint registration marks top-left */}
      <View style={{ position: 'absolute', top: 18, left: 18 }}>
        <OverprintMark />
      </View>

      {/* Corner crop ticks */}
      <CropTicks width={width} height={height} />
    </View>
  );
};

function OverprintMark() {
  const size = 24;
  return (
    <Svg width={size + 4} height={size + 4} viewBox={`0 0 ${size + 4} ${size + 4}`}>
      {/* Pink rect */}
      <Rect x={0} y={0} width={size} height={size * 0.55} fill={PINK} opacity={0.55} rx={1} />
      {/* Blue rect offset behind */}
      <Rect x={4} y={size * 0.28} width={size} height={size * 0.55} fill={BLUE} opacity={0.50} rx={1} />
    </Svg>
  );
}

function CropTicks({ width, height }: { width: number; height: number }) {
  const arm = 8;
  const inset = 10;
  const stroke = 'rgba(20,17,13,0.35)';
  const sw = 0.8;
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

function RisoGrain({ width, height }: { width: number; height: number }) {
  const count = 90;
  const dots: React.ReactNode[] = [];
  // Mulberry32-style seeded PRNG keyed from canvas size
  let s = ((width * 7919) + (height * 31)) >>> 0;
  const rng = () => {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    const cx = rng() * width;
    const cy = rng() * height;
    const r = rng() * 1.4 + 0.6;
    const colour = rng() < 0.55 ? PINK : BLUE;
    const op = rng() * 0.12 + 0.04;
    dots.push(<Circle key={i} cx={cx} cy={cy} r={r} fill={colour} opacity={op} />);
  }

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <G>{dots}</G>
    </Svg>
  );
}
