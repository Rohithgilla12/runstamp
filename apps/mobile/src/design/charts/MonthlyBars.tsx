import React from 'react';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  values: number[];
  compare?: number[];
}

const W = 320;
const H = 130;
const LEFT = 16;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function MonthlyBars({ values, compare }: Props) {
  const c = useColors();
  const max = Math.max(1, ...values, ...(compare ?? []));
  const slot = (W - LEFT - RIGHT) / 12;
  const barW = compare ? slot * 0.35 : slot * 0.55;
  const innerH = H - TOP - BOTTOM;

  return (
    <Svg width={W} height={H}>
      {values.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 - (compare ? barW + 1 : barW / 2);
        return <Rect key={`a${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill={c.accent} />;
      })}
      {compare?.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 + 1;
        return (
          <Rect key={`b${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill="none" stroke={c.ink2} strokeWidth={1} />
        );
      })}
      {MONTHS.map((m, i) => (
        <SvgText key={`l${i}`} x={LEFT + i * slot + slot / 2} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
          {m}
        </SvgText>
      ))}
    </Svg>
  );
}
