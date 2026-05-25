import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';

const INK = '#14110d';

// Engraved: double-rule outer frame (outer inset 8pt / inner inset 12pt) +
// four corner flourish ornaments. No run text. Canvas owns the background.
export const EngravedScaffolding: Scaffolding = ({ width, height }) => {
  const inset1 = 8;
  const inset2 = 14;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {/* Double-ruled concentric frame */}
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Rect
          x={inset1} y={inset1}
          width={width - inset1 * 2} height={height - inset1 * 2}
          fill="none" stroke={INK} strokeWidth={1.4}
        />
        <Rect
          x={inset2} y={inset2}
          width={width - inset2 * 2} height={height - inset2 * 2}
          fill="none" stroke={INK} strokeWidth={0.6}
        />
      </Svg>

      {/* Four corner flourish ornaments */}
      <CornerFlourishes width={width} height={height} />
    </View>
  );
};

function CornerFlourishes({ width, height }: { width: number; height: number }) {
  const size = 18;
  const inset = 20;
  const stroke = INK;
  const corners = [
    { x: inset, y: inset },
    { x: width - inset - size, y: inset },
    { x: inset, y: height - inset - size },
    { x: width - inset - size, y: height - inset - size },
  ];

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {corners.map((c, i) => {
        const cx = c.x + size / 2;
        const cy = c.y + size / 2;
        return (
          <React.Fragment key={i}>
            {/* Outer diamond outline */}
            <Rect
              x={cx - size * 0.45}
              y={cy - size * 0.45}
              width={size * 0.9}
              height={size * 0.9}
              fill="none"
              stroke={stroke}
              strokeWidth={0.7}
              opacity={0.35}
              transform={`rotate(45, ${cx}, ${cy})`}
            />
            {/* Inner cross */}
            <Rect
              x={cx - size * 0.18}
              y={cy - size * 0.18}
              width={size * 0.36}
              height={size * 0.36}
              fill="none"
              stroke={stroke}
              strokeWidth={0.5}
              opacity={0.22}
              transform={`rotate(45, ${cx}, ${cy})`}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
