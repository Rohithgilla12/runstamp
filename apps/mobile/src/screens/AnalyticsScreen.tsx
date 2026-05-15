import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACT, ALLTIME, HEATMAP, MONTHLY_KM, WEEKLY_KM, distUnit } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card, Delta } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { BarChart, Heatmap, heatColor } from '../design/charts';
import { SectionHeader } from './HomeScreen';
import { CumulativeChart } from './_AnalyticsCharts';
import type { TabProps } from '../nav/types';

type Scope = 'year' | 'month' | 'all';

export function AnalyticsScreen(_props: TabProps<'Stats'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>('year');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>STATISTICS</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 2 }}>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>The </TText>
          <TText variant="serifItalic" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>bigger</TText>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}> picture.</TText>
        </View>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', backgroundColor: c.paper2, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.line }}>
          {(['year', 'month', 'all'] as const).map((id) => (
            <Pressable key={id} onPress={() => setScope(id)} style={{
              flex: 1, paddingVertical: 9, borderRadius: 9,
              backgroundColor: scope === id ? c.ink : 'transparent', alignItems: 'center'
            }}>
              <TText style={{ fontSize: 13, fontWeight: '500', color: scope === id ? c.paper : c.ink2 }}>
                {id === 'year' ? 'Year' : id === 'month' ? 'Month' : 'All-time'}
              </TText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
        {scope === 'year' && <YearView />}
        {scope === 'month' && <MonthView />}
        {scope === 'all' && <AllTimeView />}
      </View>
    </ScrollView>
  );
}

function YearView() {
  const c = useColors();
  const { units } = useAppState();
  const [year, setYear] = useState(2026);
  const total = MONTHLY_KM.reduce((a, b) => a + b.km, 0);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Pressable onPress={() => setYear((y) => y - 1)} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon.back size={14} color={c.ink2} />
        </Pressable>
        <TText variant="serif" style={{ fontSize: 24, letterSpacing: -0.3 }}>{year}</TText>
        <Pressable onPress={() => setYear((y) => y + 1)} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
          <Icon.chevR size={14} color={c.ink2} />
        </Pressable>
      </View>

      <Card style={{ backgroundColor: c.paper2 }}>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1.4 }}>
            <Eyebrow>DISTANCE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TText variant="monoMedium" style={{ fontSize: 44, lineHeight: 44, letterSpacing: -1.4, color: c.ink }}>
                {Math.round(total).toLocaleString()}
              </TText>
              <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 4 }}>{distUnit(units)}</TText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow>RUNS</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink }}>97</TText>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow>HOURS</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink }}>108</TText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <Delta value={18.4} format={(v) => `${v}% vs ${year - 1}`} />
          <TText style={{ fontSize: 11, color: c.ink3 }}>On pace for 3,200 km ({year}).</TText>
        </View>
      </Card>

      <SectionHeader title="Year in pixels" right={<Eyebrow>52 W · 7 D</Eyebrow>} />
      <Card>
        <Heatmap data={HEATMAP} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Eyebrow>LESS</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0, 1, 2, 3, 4].map((v) => (
              <View key={v} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: heatColor(v, c) }} />
            ))}
          </View>
          <Eyebrow>MORE</Eyebrow>
        </View>
      </Card>

      <SectionHeader title="Monthly distance" />
      <Card>
        <BarChart data={MONTHLY_KM} width={320} height={120} valKey="km" labelKey="m" highlight={(d) => Boolean('partial' in d && d.partial)} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <TText style={{ fontSize: 11, color: c.ink3 }}>
            Peak: <TText variant="mono" style={{ color: c.ink }}>Apr · 318 km</TText>
          </TText>
          <TText style={{ fontSize: 11, color: c.ink3 }}>
            Avg: <TText variant="mono" style={{ color: c.ink }}>270 km</TText>
          </TText>
        </View>
      </Card>

      <SectionHeader title="Personal bests" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          { d: '5K',  t: '20:52',   sub: 'Kanteerava · Apr 12',     pr: true  },
          { d: '10K', t: '44:32',   sub: 'May 10 · ▲ 1:14 in 2026', pr: false },
          { d: 'HM',  t: '1:38:44', sub: 'Mumbai HM · Jan 19',      pr: true  },
          { d: 'M',   t: '3:32:18', sub: 'Mumbai Mar · Jan 21',     pr: false }
        ].map((e, i) => (
          <View key={i} style={{ width: '48.5%' }}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Eyebrow>{e.d}</Eyebrow>
                {e.pr && <Eyebrow style={{ color: c.accent }}>NEW</Eyebrow>}
              </View>
              <TText variant="monoMedium" style={{ fontSize: 22, marginTop: 4, color: c.ink }}>{e.t}</TText>
              <TText style={{ fontSize: 10.5, color: c.ink3, marginTop: 2 }}>{e.sub}</TText>
            </Card>
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthView() {
  const c = useColors();
  const { units } = useAppState();
  const { activities } = useActivities();
  const days = 31;
  const startDow = 4;
  const today = 17;
  const activeKm: Record<number, number> = {};
  const runs = activities.length > 0 ? activities : ACT;
  runs.forEach((a) => {
    if (a.date.startsWith('2026-05')) {
      const d = parseInt(a.date.split('-')[2], 10);
      activeKm[d] = (activeKm[d] ?? 0) + a.distance;
    }
  });
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <View>
      <Card style={{ backgroundColor: c.paper2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <View>
            <Eyebrow>MAY 2026</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 36, letterSpacing: -0.8, color: c.ink }}>188.4</TText>
              <TText style={{ fontSize: 12, color: c.ink3, marginLeft: 4 }}>{distUnit(units)}</TText>
            </View>
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 4 }}>13 runs · 14:32:18 · 412m climbed</TText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Eyebrow>LOAD</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 18, color: c.accent }}>HIGH</TText>
            <TText style={{ fontSize: 10, color: c.ink3 }}>TSS · 142/wk</TText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <TText style={{ fontSize: 9, color: c.ink3, fontWeight: '500' }}>{d}</TText>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {cells.map((d, i) => {
            const km = d ? activeKm[d] : undefined;
            const isToday = d === today;
            return (
              <View key={i} style={{
                width: `${100 / 7}%`, aspectRatio: 1, padding: 2
              }}>
                <View style={{
                  flex: 1, borderRadius: 6,
                  backgroundColor: km ? c.accent : (d ? c.paper : 'transparent'),
                  borderWidth: isToday ? 1.5 : (d ? 1 : 0),
                  borderColor: isToday ? c.ink : c.line,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: km ? Math.min(0.4 + km / 30 * 0.6, 1) : 1
                }}>
                  {d != null && (
                    <TText variant="mono" style={{ fontSize: 9, color: km ? '#fff' : c.ink3, fontWeight: isToday ? '600' : '400' }}>
                      {d}
                    </TText>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Weekly mileage" right={<Eyebrow>LAST 12 W</Eyebrow>} />
      <Card>
        <BarChart data={WEEKLY_KM} width={320} height={130} valKey="km" labelKey="w" highlight={(d) => Boolean('current' in d && d.current)} />
      </Card>

      <SectionHeader title="Filter" right={<Icon.filter size={16} color={c.ink2} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {['All runs', 'Long ≥20K', 'Workouts', 'Easy', 'HR Z2', 'By shoe', 'Travel'].map((t, i) => (
          <View key={t} style={{
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
            borderWidth: 1, borderColor: c.line,
            backgroundColor: i === 0 ? c.ink : 'transparent'
          }}>
            <TText style={{ fontSize: 12, fontWeight: '500', color: i === 0 ? c.paper : c.ink2 }}>{t}</TText>
          </View>
        ))}
      </View>
    </View>
  );
}

function AllTimeView() {
  const c = useColors();
  const { units } = useAppState();
  return (
    <View>
      <Card style={{ backgroundColor: c.ink, borderColor: 'transparent', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -40, opacity: 0.07 }}>
          <SunMark size={180} />
        </View>
        <Eyebrow style={{ color: 'rgba(243,237,226,0.5)' }}>SINCE AUG 2023</Eyebrow>
        <TText variant="monoMedium" style={{ fontSize: 60, lineHeight: 60, letterSpacing: -2.4, color: c.paper, marginTop: 6 }}>
          {ALLTIME.km.toLocaleString()}
        </TText>
        <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', marginTop: 4 }}>{distUnit(units).toUpperCase()} LIFETIME</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(243,237,226,0.12)' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.5)' }}>RUNS</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 20, color: c.paper }}>{ALLTIME.runs}</TText>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.5)' }}>HOURS</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 20, color: c.paper }}>393</TText>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.5)' }}>ELEV</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 20, color: c.paper }}>38.4k</TText>
          </View>
        </View>
      </Card>

      <SectionHeader title="Lifetime PRs" />
      <Card padded={false}>
        {[
          ['1K',     '3:42',    'Jan 14, 2026'],
          ['1 mile', '6:08',    'Jan 14, 2026'],
          ['5K',     '20:52',   'Apr 12, 2026'],
          ['10K',    '43:18',   'Nov 03, 2025'],
          ['HM',     '1:38:44', 'Jan 19, 2026'],
          ['M',      '3:32:18', 'Jan 21, 2026']
        ].map(([d, t, sub], i) => (
          <View key={i} style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 14,
            borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.line2
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>{d}</TText>
              <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{t}</TText>
            </View>
            <TText style={{ fontSize: 11, color: c.ink3 }}>{sub}</TText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Streaks" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Card>
            <Eyebrow>CURRENT</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TText variant="monoMedium" style={{ fontSize: 30, color: c.ink }}>6</TText>
              <TText style={{ fontSize: 13, color: c.ink3, marginLeft: 4 }}>days</TText>
            </View>
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>Since May 11</TText>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card>
            <Eyebrow>LONGEST</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TText variant="monoMedium" style={{ fontSize: 30, color: c.ink }}>{ALLTIME.longestStreak}</TText>
              <TText style={{ fontSize: 13, color: c.ink3, marginLeft: 4 }}>days</TText>
            </View>
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>Aug 4 → Aug 31, 2025</TText>
          </Card>
        </View>
      </View>

      <SectionHeader title="Cumulative distance" />
      <Card>
        <CumulativeChart />
      </Card>
    </View>
  );
}
