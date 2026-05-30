import React from 'react';
import { View } from 'react-native';
import { distUnit, fmtDist, fmtTime } from '../../lib/format';
import { Card } from '../../design/atoms';
import { SunMark } from '../../design/SunMark';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import type { WeekKey } from '../../analytics/week';
import { labelWeek } from '../../analytics/week';
import { Stat } from './atoms';
import { MONTH_NAMES, type Aggregate, type Scope } from './period';

export function ScopedHero({ scope, agg, year, month, week }: { scope: Scope; agg: Aggregate; year: number; month: number; week: WeekKey }) {
  const c = useColors();
  const { units } = useAppState();
  const label = scope === 'year'
    ? String(year)
    : scope === 'month'
      ? `${MONTH_NAMES[month - 1].toUpperCase()} ${year}`
      : labelWeek(week).toUpperCase();
  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 44, lineHeight: 52, letterSpacing: -1.4, color: c.ink }}>
          {fmtDist(agg.totalKm, units)}
        </TText>
        <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 4 }}>{distUnit(units)}</TText>
      </View>
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
        <Stat label="RUNS" value={String(agg.runs)} />
        <Stat label="TIME" value={fmtTime(agg.totalSec)} />
        <Stat label="ELEV" value={`${Math.round(agg.elevM).toLocaleString()} m`} />
      </View>
    </Card>
  );
}

export function LifetimeHero({ agg }: { agg: Aggregate }) {
  const c = useColors();
  const { units } = useAppState();
  // The hero number bypassed fmtDist and rendered km even when units was
  // 'mi' — imperial users saw the kilometre figure under a "MI TOTAL"
  // eyebrow. We round to a whole unit at this scale (thousands of km / mi)
  // so toLocaleString gives a comma-separated integer in both systems.
  const total = units === 'mi' ? agg.totalKm / 1.609 : agg.totalKm;
  return (
    <Card style={{ backgroundColor: c.ink, borderColor: 'transparent', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -40, top: -40, opacity: 0.07 }}>
        <SunMark size={180} />
      </View>
      <Eyebrow style={{ color: c.onInk3 }}>LIFETIME</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 60, lineHeight: 70, letterSpacing: -2.4, color: c.paper, marginTop: 6 }}>
        {Math.round(total).toLocaleString()}
      </TText>
      <Eyebrow style={{ color: c.onInk3, marginTop: 4 }}>{distUnit(units).toUpperCase()} TOTAL</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.onInkDivider }}>
        <Stat dark label="RUNS" value={String(agg.runs)} />
        <Stat dark label="TIME" value={fmtTime(agg.totalSec)} />
        <Stat dark label="ELEV" value={`${Math.round(agg.elevM).toLocaleString()} m`} />
      </View>
    </Card>
  );
}
