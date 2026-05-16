import React, { useMemo } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  year: number;
  month: number;
  kmByDate: Record<string, number>;
}

const W = 320;
const ROWS = 6;
const CELL = W / 7;
const TOP = 20;

export function MonthCalendarDots({ year, month, kmByDate }: Props) {
  const c = useColors();
  const H = TOP + ROWS * CELL;
  const cells = useMemo(() => buildCells(year, month, kmByDate), [year, month, kmByDate]);

  return (
    <Svg width={W} height={H}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <SvgText key={i} x={i * CELL + CELL / 2} y={12} fontSize={9} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
          {d}
        </SvgText>
      ))}
      {cells.map((cell, idx) => {
        const col = idx % 7;
        const row = Math.floor(idx / 7);
        const cx = col * CELL + CELL / 2;
        const cy = TOP + row * CELL + CELL / 2;
        if (!cell) return null;
        const r = cell.km <= 0 ? 1.4 : cell.km < 7 ? 3 : cell.km < 15 ? 4.5 : 6;
        const fill = cell.km <= 0 ? c.line2 : c.accent;
        return (
          <React.Fragment key={idx}>
            <Circle cx={cx} cy={cy - 3} r={r} fill={fill} />
            <SvgText x={cx} y={cy + 10} fontSize={8} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
              {cell.day}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function buildCells(year: number, month: number, kmByDate: Record<string, number>) {
  const first = new Date(year, month - 1, 1);
  const startCol = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number; km: number } | null> = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, km: kmByDate[key] ?? 0 });
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}
