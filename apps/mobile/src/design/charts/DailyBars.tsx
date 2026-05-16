import React from 'react';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  /** 7 values, Monday first. Sunday last. */
  values: number[];
}

const W = 320;
const H = 130;
const LEFT = 16;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DailyBars({ values }: Props) {
  const c = useColors();
  const max = Math.max(1, ...values);
  const slot = (W - LEFT - RIGHT) / 7;
  const barW = slot * 0.55;
  const innerH = H - TOP - BOTTOM;

  // Highlight today's bar (index 0..6 in Mon-first ordering).
  const todayMonFirst = (new Date().getDay() + 6) % 7;

  return (
    <Svg width={W} height={H}>
      {values.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 - barW / 2;
        return (
          <Rect
            key={i}
            x={x}
            y={TOP + (innerH - h)}
            width={barW}
            height={h}
            rx={2}
            fill={i === todayMonFirst ? c.accent : c.ink2}
            opacity={v > 0 ? 1 : 0.35}
          />
        );
      })}
      {DAYS.map((d, i) => (
        <SvgText
          key={`l${i}`}
          x={LEFT + i * slot + slot / 2}
          y={H - 6}
          fontSize={10}
          fill={i === todayMonFirst ? c.accent : c.ink3}
          textAnchor="middle"
          fontFamily="JetBrainsMono-Regular"
        >
          {d}
        </SvgText>
      ))}
    </Svg>
  );
}
