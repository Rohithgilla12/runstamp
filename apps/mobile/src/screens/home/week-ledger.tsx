import React from 'react';
import { View } from 'react-native';
import { distUnit, fmtDist, fmtTime } from '../../data/sample';
import { Sep } from '../../design/atoms';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import type { WeekStats } from './week-stats';

// Replaces the boxed WeekSummary card. One inline serif italic number plus
// a quiet mono detail line. No card backdrop, no border — the page is the
// surface, the type IS the chart.
export function WeekLedger({ stats }: { stats: WeekStats }) {
  const c = useColors();
  const { units } = useAppState();
  const positive = stats.vsLastKm >= 0;
  const deltaTone = positive ? c.moss : c.ink3;
  const deltaSign = positive ? '+' : '−';
  const deltaMag = Math.abs(stats.vsLastKm).toFixed(1);
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Eyebrow style={{ color: c.ink3 }}>THIS WEEK</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
          {fmtDist(stats.totalKm, units)}
        </TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginLeft: 5 }}>{distUnit(units)}</TText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{stats.runs} runs</TText>
        <Sep />
        <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{fmtTime(stats.totalSec)}</TText>
        <Sep />
        <TText variant="mono" style={{ fontSize: 11, color: deltaTone }}>
          {deltaSign}{deltaMag} {distUnit(units)} vs last
        </TText>
      </View>
    </View>
  );
}
