import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';
import { ChartTooltip } from './ChartTooltip';

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
const DAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DailyBars({ values }: Props) {
  const c = useColors();
  const max = Math.max(1, ...values);
  const slot = (W - LEFT - RIGHT) / 7;
  const barW = slot * 0.55;
  const innerH = H - TOP - BOTTOM;

  // Highlight today's bar (index 0..6 in Mon-first ordering).
  const todayMonFirst = (new Date().getDay() + 6) % 7;

  // Helper for the tooltip: lift each value up to the top of its bar so the
  // dot pins to the bar's tip instead of floating mid-chart.
  const yTop = (i: number) => TOP + (innerH - (values[i] / max) * innerH);

  return (
    <View style={{ width: W, height: H }}>
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
      <ChartTooltip
        series={values}
        left={LEFT + slot / 2}
        right={LEFT + 6 * slot + slot / 2}
        width={W}
        height={H}
        dotColor={c.ink}
        pointY={(_v, idx) => yTop(idx)}
        formatPrimary={(_v, idx) => DAYS_FULL[idx] ?? ''}
        formatValue={(v) => `${v.toFixed(1)} km`}
      />
    </View>
  );
}
