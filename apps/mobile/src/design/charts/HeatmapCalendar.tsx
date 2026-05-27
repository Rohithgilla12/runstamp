import React, { useMemo, useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import type { HeatmapGrid, HeatmapDay } from '../../analytics/heatmap';
import { useColors } from '../theme';
import { TText } from '../typography';
import { staggeredT } from './reveal';

interface Props {
  grid: HeatmapGrid;
  ghost?: HeatmapGrid;
  onSelectDay?: (day: HeatmapDay) => void;
  /** 0..1 reveal progress. Undefined = static (current behavior). */
  progress?: number;
}

const LEFT = 14;
const TOP = 14;
const GAP = 1.5;
const FALLBACK_W = 320;
const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function HeatmapCalendar({ grid, ghost, onSelectDay, progress }: Props) {
  const c = useColors();
  const [layoutW, setLayoutW] = useState(0);
  const revealing = progress !== undefined;
  // Total cell count for staggering. Cells reveal in their natural week-by-week
  // column-major order, which reads chronologically since heatmap weeks are
  // built from Jan 1 → Dec 31.
  const totalCells = grid.weeks.reduce((a, w) => a + w.length, 0);

  const numWeeks = grid.weeks.length;
  const containerW = layoutW > 0 ? layoutW : FALLBACK_W;
  const cell = Math.max(2, (containerW - LEFT) / numWeeks - GAP);
  const step = cell + GAP;
  const W = LEFT + numWeeks * step;
  const H = TOP + 7 * step;

  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < grid.weeks.length; i++) {
      const first = grid.weeks[i][0];
      if (!first) continue;
      const month = Number(first.date.slice(5, 7));
      if (month !== lastMonth) {
        ticks.push({ x: LEFT + i * step, label: monthAbbr(month) });
        lastMonth = month;
      }
    }
    return ticks;
  }, [grid, step]);

  const fillFor = (bucket: HeatmapDay['bucket']) => {
    if (bucket === 0) return c.paper2;
    if (bucket === 1) return withAlpha(c.accent, 0.18);
    if (bucket === 2) return withAlpha(c.accent, 0.36);
    if (bucket === 3) return withAlpha(c.accent, 0.66);
    return c.accent;
  };

  const handlePress = (evt: GestureResponderEvent) => {
    if (!onSelectDay) return;
    const { locationX, locationY } = evt.nativeEvent;
    const wi = Math.floor((locationX - LEFT) / step);
    const di = Math.floor((locationY - TOP) / step);
    const day = grid.weeks[wi]?.[di];
    if (day && !day.inFuture) onSelectDay(day);
  };

  const onLayout = (e: LayoutChangeEvent) => setLayoutW(e.nativeEvent.layout.width);

  const svg = (
    <Svg width={W} height={H}>
      {monthTicks.map((t, i) => (
        <SvgText key={i} x={t.x} y={10} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">
          {t.label}
        </SvgText>
      ))}
      {WEEKDAY_LABELS.map((l, i) =>
        l ? (
          <SvgText key={i} x={0} y={TOP + i * step + cell * 0.8} fontSize={7} fill={c.ink3} fontFamily="JetBrainsMono-Regular">
            {l}
          </SvgText>
        ) : null
      )}
      {grid.weeks.map((week, wi) => (
        <G key={wi}>
          {week.map((day, di) => {
            const cellIndex = wi * 7 + di;
            const t = revealing ? staggeredT(progress, cellIndex, totalCells, 0.18) : 1;
            return (
              <Rect
                key={di}
                x={LEFT + wi * step}
                y={TOP + di * step}
                width={cell}
                height={cell}
                rx={Math.min(2, cell * 0.25)}
                fill={day.inFuture ? 'transparent' : fillFor(day.bucket)}
                stroke={day.inFuture ? c.line2 : 'transparent'}
                strokeDasharray={day.inFuture ? '1 1' : undefined}
                opacity={revealing ? t : 1}
              />
            );
          })}
        </G>
      ))}
      {ghost?.weeks.map((week, wi) => (
        <G key={`g${wi}`} opacity={0.35}>
          {week.map((day, di) =>
            day.bucket > 0 ? (
              <Rect
                key={di}
                x={LEFT + wi * step}
                y={TOP + di * step}
                width={cell}
                height={cell}
                rx={Math.min(2, cell * 0.25)}
                fill="none"
                stroke={c.ink2}
                strokeWidth={1}
              />
            ) : null
          )}
        </G>
      ))}
    </Svg>
  );

  return (
    <View onLayout={onLayout}>
      {onSelectDay ? <Pressable onPress={handlePress}>{svg}</Pressable> : svg}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>Less</TText>
        {[0, 1, 2, 3, 4].map((b) => (
          <View key={b} style={{ width: 9, height: 9, borderRadius: 1.5, backgroundColor: fillFor(b as HeatmapDay['bucket']) }} />
        ))}
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>More</TText>
      </View>
    </View>
  );
}

function monthAbbr(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? '';
}

function withAlpha(hexOrRgb: string, alpha: number): string {
  if (hexOrRgb.startsWith('#')) {
    const r = parseInt(hexOrRgb.slice(1, 3), 16);
    const g = parseInt(hexOrRgb.slice(3, 5), 16);
    const b = parseInt(hexOrRgb.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hexOrRgb;
}
