import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';

export function CumulativeChart() {
  const c = useColors();
  const W = 320;
  const H = 140;
  const pad = 14;
  // Deterministic-ish curve so it doesn't shift between renders
  const monthly = useMemo(() => {
    const months = 33;
    const arr: number[] = [];
    let cum = 0;
    for (let i = 0; i < months; i++) {
      const km = 150 + Math.sin(i * 0.7) * 60 + i * 4;
      cum += km;
      arr.push(cum);
    }
    return arr;
  }, []);
  const max = monthly[monthly.length - 1];
  const step = (W - pad * 2) / (monthly.length - 1);
  const y = (v: number) => pad + (H - pad * 2) - (v / max) * (H - pad * 2);
  const d = monthly.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <View>
      <Svg width={W} height={H}>
        {[0.25, 0.5, 0.75].map((p, i) => (
          <Line key={i} x1={pad} y1={pad + (H - pad * 2) * p} x2={W - pad} y2={pad + (H - pad * 2) * p} stroke={c.line2} />
        ))}
        <Path d={`${d} L${W - pad} ${H - pad} L${pad} ${H - pad}Z`} fill={c.accent} opacity={0.12} />
        <Path d={d} fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={W - pad} cy={y(max)} r={4} fill={c.accent} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>AUG ’23</TText>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>MAY ’26</TText>
      </View>
    </View>
  );
}
