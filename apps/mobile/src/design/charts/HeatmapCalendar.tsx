import React, { useMemo } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import type { HeatmapGrid, HeatmapDay } from '../../analytics/heatmap';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  grid: HeatmapGrid;
  ghost?: HeatmapGrid;
  onSelectDay?: (day: HeatmapDay) => void;
}

const CELL = 11;
const GAP = 2;
const LEFT = 22;
const TOP = 14;
const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function HeatmapCalendar({ grid, ghost, onSelectDay }: Props) {
  const c = useColors();
  const W = LEFT + grid.weeks.length * (CELL + GAP);
  const H = TOP + 7 * (CELL + GAP);

  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < grid.weeks.length; i++) {
      const first = grid.weeks[i][0];
      if (!first) continue;
      const month = Number(first.date.slice(5, 7));
      if (month !== lastMonth) {
        ticks.push({ x: LEFT + i * (CELL + GAP), label: monthAbbr(month) });
        lastMonth = month;
      }
    }
    return ticks;
  }, [grid]);

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
    const wi = Math.floor((locationX - LEFT) / (CELL + GAP));
    const di = Math.floor((locationY - TOP) / (CELL + GAP));
    const day = grid.weeks[wi]?.[di];
    if (day && !day.inFuture) onSelectDay(day);
  };

  const svg = (
    <Svg width={W} height={H}>
      {monthTicks.map((t, i) => (
        <SvgText key={i} x={t.x} y={10} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">
          {t.label}
        </SvgText>
      ))}
      {WEEKDAY_LABELS.map((l, i) =>
        l ? (
          <SvgText key={i} x={0} y={TOP + i * (CELL + GAP) + 9} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">
            {l}
          </SvgText>
        ) : null
      )}
      {grid.weeks.map((week, wi) => (
        <G key={wi}>
          {week.map((day, di) => (
            <Rect
              key={di}
              x={LEFT + wi * (CELL + GAP)}
              y={TOP + di * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={day.inFuture ? 'transparent' : fillFor(day.bucket)}
              stroke={day.inFuture ? c.line2 : 'transparent'}
              strokeDasharray={day.inFuture ? '1 1' : undefined}
            />
          ))}
        </G>
      ))}
      {ghost?.weeks.map((week, wi) => (
        <G key={`g${wi}`} opacity={0.35}>
          {week.map((day, di) =>
            day.bucket > 0 ? (
              <Rect
                key={di}
                x={LEFT + wi * (CELL + GAP)}
                y={TOP + di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
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
    <View>
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
