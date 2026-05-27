import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';
import { ChartTooltip } from './ChartTooltip';
import { LegendChip, LegendRow } from './ChartLegend';
import { staggeredT } from './reveal';

interface Props {
  values: number[];
  compare?: number[];
  /**
   * 0..1 reveal progress. When undefined, the chart renders fully (current
   * behavior); when set, bars stagger-rise in chronological order. Used by
   * the video export pipeline to drive the per-frame paint.
   */
  progress?: number;
}

const W = 320;
const H = 130;
const LEFT = 16;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTHS_FULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyBars({ values, compare, progress }: Props) {
  const c = useColors();
  const max = Math.max(1, ...values, ...(compare ?? []));
  const slot = (W - LEFT - RIGHT) / 12;
  const barW = compare ? slot * 0.35 : slot * 0.55;
  const innerH = H - TOP - BOTTOM;
  const revealing = progress !== undefined;
  const scaleFor = (i: number) => (revealing ? staggeredT(progress, i, values.length) : 1);

  // Pin tooltip dot to the top of the primary bar.
  const yTop = (i: number) => TOP + (innerH - (values[i] / max) * innerH);

  return (
    <View>
      {compare && (
        <LegendRow>
          <LegendChip color={c.accent} label="This period" />
          <LegendChip color={c.ink2} label="vs compare" outline />
        </LegendRow>
      )}
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H}>
          {values.map((v, i) => {
            const h = (v / max) * innerH * scaleFor(i);
            const x = LEFT + i * slot + slot / 2 - (compare ? barW + 1 : barW / 2);
            return <Rect key={`a${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill={c.accent} />;
          })}
          {compare?.map((v, i) => {
            const h = (v / max) * innerH * scaleFor(i);
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
        <ChartTooltip
          series={values}
          left={LEFT + slot / 2}
          right={LEFT + 11 * slot + slot / 2}
          width={W}
          height={H}
          dotColor={c.accent}
          pointY={(_v, idx) => yTop(idx)}
          formatPrimary={(_v, idx) => MONTHS_FULL[idx] ?? ''}
          formatValue={(v, idx) => {
            const cmp = compare?.[idx];
            const base = `${Math.round(v)} km`;
            return cmp != null ? `${base} · vs ${Math.round(cmp)}` : base;
          }}
        />
      </View>
    </View>
  );
}
