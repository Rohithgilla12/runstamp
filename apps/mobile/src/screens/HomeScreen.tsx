import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ACT, BEST_EFFORTS_MONTH, PLACES, RECAPS, SHOES, STAMPS, THIS_WEEK,
  distUnit, fmtDist, fmtPace, fmtTime,
  type ActivityKind, type Stamp
} from '../data/sample';
import { StampBadge } from '../design/StampBadge';
import { useAppState } from '../state/AppState';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card, Chip, Delta } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { RouteMap } from '../design/RouteMap';
import { MiniWorldMap } from '../design/charts';
import type { TabProps } from '../nav/types';

export function HomeScreen({ navigation }: TabProps<'Home'>) {
  const c = useColors();
  const { units } = useAppState();
  const insets = useSafeAreaInsets();
  const latest = ACT[0];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>SUN · MAY 17 · 2026</Eyebrow>
          <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.6, marginTop: 4 }}>Good morning,</TText>
          <TText variant="serifItalic" style={{ fontSize: 28, lineHeight: 32, color: c.ink }}>Gilla.</TText>
        </View>
        <View style={{ marginTop: 4 }}>
          <SunMark size={32} />
        </View>
      </View>

      {/* Live-sync + stamps chip row */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', gap: 8 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
          backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.moss }} />
          <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>SYNCED · 4m AGO</TText>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Stamps')}
          style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
            backgroundColor: c.ink, opacity: pressed ? 0.85 : 1
          }]}
        >
          <Icon.spark size={12} color={c.accent} />
          <TText variant="mono" style={{ fontSize: 11, color: c.paper }}>
            {STAMPS.filter((s) => !!s.earnedAt).length} STAMPS
          </TText>
        </Pressable>
      </View>

      {/* Hero post-run card */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <PostRunCard
          run={latest}
          onOpen={() => navigation.navigate('Activity', { id: latest.id })}
          onShare={() => navigation.navigate('Editor', { id: latest.id })}
        />
      </View>

      <SectionHeader title="This week" right={<TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>W21 · MARATHON BUILD</TText>} />
      <View style={{ paddingHorizontal: 20 }}>
        <WeekStrip />
      </View>

      <SectionHeader title="Best efforts" right={<Eyebrow style={{ color: c.ink3 }}>THIS MONTH</Eyebrow>} />
      <View style={{ paddingHorizontal: 20 }}>
        <BestEffortsRow />
      </View>

      <SectionHeader title="Recap" />
      <View style={{ paddingHorizontal: 20 }}>
        <RecapCarousel />
      </View>

      <SectionHeader title="Recently earned" right={
        <Pressable onPress={() => navigation.navigate('Stamps')}>
          <TText style={{ fontSize: 13, color: c.ink2 }}>See all  ›</TText>
        </Pressable>
      } />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {STAMPS.filter((s) => !!s.earnedAt)
          .sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))
          .slice(0, 6)
          .map((s) => (
            <Pressable key={s.id} onPress={() => navigation.navigate('Stamps')} style={({ pressed }) => [{
              alignItems: 'center', width: 110,
              backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 14,
              paddingVertical: 12, paddingHorizontal: 6,
              opacity: pressed ? 0.85 : 1
            }]}>
              <StampBadge id={`home-${s.id}`} name={s.name} tier={s.tier} earned size={64} />
              <TText style={{ fontSize: 11, fontWeight: '500', color: c.ink, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
                {s.name}
              </TText>
            </Pressable>
          ))}
      </ScrollView>

      <SectionHeader title="Shoes" right={<TText style={{ fontSize: 13, color: c.ink2 }}>Manage</TText>} />
      <View style={{ paddingHorizontal: 20 }}>
        <ShoesWidget />
      </View>

      <SectionHeader title="Places" right={
        <Pressable onPress={() => navigation.navigate('Places')}>
          <TText style={{ fontSize: 13, color: c.ink2 }}>See all  ›</TText>
        </Pressable>
      } />
      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <PlacesPreview onOpen={() => navigation.navigate('Places')} />
      </View>
    </ScrollView>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, letterSpacing: -0.3 }}>{title}</TText>
      {right}
    </View>
  );
}

const POST_RUN_HEIGHT = 380;

function PostRunCard({ run, onOpen, onShare }: { run: typeof ACT[number]; onOpen: () => void; onShare: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [{ borderRadius: 18, overflow: 'hidden', backgroundColor: c.ink, opacity: pressed ? 0.95 : 1 }]}>
      <View style={{ position: 'relative', height: POST_RUN_HEIGHT }}>
        <View style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
          <RouteMap points={run.route} width={362} height={POST_RUN_HEIGHT} style="dark" accent={c.accent} />
        </View>
        <LinearGradient
          colors={['rgba(14,13,11,0.4)', 'rgba(14,13,11,0.1)', 'rgba(14,13,11,0.85)']}
          locations={[0, 0.35, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.accent, marginBottom: 4 }}>POST-RUN · 4 MIN AGO</Eyebrow>
              <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, color: c.paper, letterSpacing: -0.4 }}>{run.title}</TText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon.pin size={12} color="rgba(243,237,226,0.6)" />
                <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.6)' }}>{run.place}</TText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Icon.sun size={20} color={c.accent} />
              <TText variant="mono" style={{ fontSize: 10, color: 'rgba(243,237,226,0.6)', marginTop: 4 }}>{run.weather.t}°</TText>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <View style={{ flex: 1.2 }}>
              <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 9 }}>DISTANCE</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <TText variant="monoMedium" style={{ fontSize: 46, lineHeight: 46, letterSpacing: -1.4, color: c.paper }}>
                  {fmtDist(run.distance, units)}
                </TText>
                <TText style={{ fontSize: 14, color: 'rgba(243,237,226,0.6)', marginLeft: 4 }}>{distUnit(units)}</TText>
              </View>
            </View>
            <View style={{ flex: 0.9 }}>
              <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 9 }}>PACE</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtPace(run.pace, units)}</TText>
              <TText style={{ fontSize: 10, color: 'rgba(243,237,226,0.5)' }}>/{distUnit(units)}</TText>
            </View>
            <View style={{ flex: 1.1 }}>
              <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 9 }}>TIME</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtTime(run.seconds)}</TText>
              <TText style={{ fontSize: 10, color: 'rgba(243,237,226,0.5)' }}>h:m:s</TText>
            </View>
          </View>

          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(243,237,226,0.12)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon.heart size={12} color={c.accent} />
              <TText variant="mono" style={{ fontSize: 11, color: 'rgba(243,237,226,0.7)' }}>{run.avgHr} avg · {run.maxHr} max</TText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon.mountain size={12} color="rgba(243,237,226,0.7)" />
              <TText variant="mono" style={{ fontSize: 11, color: 'rgba(243,237,226,0.7)' }}>{run.elev} m</TText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon.flame size={12} color="rgba(243,237,226,0.7)" />
              <TText variant="mono" style={{ fontSize: 11, color: 'rgba(243,237,226,0.7)' }}>{run.cal} kcal</TText>
            </View>
          </View>

          <Pressable
            onPress={(e) => { e.stopPropagation(); onShare(); }}
            style={({ pressed }) => [{
              marginTop: 14, height: 46, borderRadius: 12, backgroundColor: c.accent,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
              opacity: pressed ? 0.85 : 1
            }]}
          >
            <Icon.share size={16} color="#fff" />
            <TText style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Create share card</TText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function WeekStrip() {
  const c = useColors();
  const w = THIS_WEEK;
  const maxKm = Math.max(...w.days.map((d) => d.km));
  const kindColor = (k: ActivityKind | undefined): string => {
    if (k === 'long') return c.accent;
    if (k === 'workout') return '#8a5a30';
    if (k === 'easy') return c.moss;
    return c.ink3;
  };
  return (
    <View style={{ backgroundColor: c.paper2, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoMedium" style={{ fontSize: 42, lineHeight: 42, letterSpacing: -0.8, color: c.ink }}>47.89</TText>
            <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 4 }}>km</TText>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
            <TText variant="mono" style={{ fontSize: 12, color: c.ink3 }}>4 runs</TText>
            <TText variant="mono" style={{ fontSize: 12, color: c.ink3 }}>3:37:00</TText>
            <Delta value={w.vsLast.km} format={(v) => `${v.toFixed(1)} km`} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Eyebrow>TARGET</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>75 km</TText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {w.days.map((d, i) => {
          const h = d.rest ? 8 : Math.max(14, (d.km / maxKm) * 56);
          return (
            <View key={i} style={{
              flex: 1, alignItems: 'center', gap: 6,
              paddingVertical: 8, borderRadius: 10,
              backgroundColor: d.today ? c.paper3 : 'transparent',
              borderWidth: 1, borderColor: d.today ? c.line : 'transparent'
            }}>
              <View style={{ width: '72%', height: h, borderRadius: 3, backgroundColor: d.rest ? c.line : kindColor(d.kind), opacity: d.rest ? 0.5 : 1 }} />
              <TText style={{ fontSize: 10, color: c.ink3, fontWeight: '500' }}>{d.d}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: d.today ? c.ink : c.ink3 }}>{d.km ? d.km.toFixed(0) : '—'}</TText>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
        <Legend color={c.accent} label="Long" />
        <Legend color="#8a5a30" label="Workout" />
        <Legend color={c.moss} label="Easy" />
        <Legend color={c.line} label="Rest" dim />
      </View>
    </View>
  );
}

function Legend({ color, label, dim }: { color: string; label: string; dim?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, opacity: dim ? 0.6 : 1 }} />
      <TText style={{ fontSize: 10, color: c.ink3 }}>{label}</TText>
    </View>
  );
}

function BestEffortsRow() {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {BEST_EFFORTS_MONTH.map((b, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: b.isPR ? c.ink : c.paper2,
            borderWidth: 1,
            borderColor: b.isPR ? c.ink : c.line,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingTop: 10,
            paddingBottom: 12
          }}
        >
          <Eyebrow style={{ color: b.isPR ? c.accent : c.ink3, fontSize: 9 }}>{b.isPR ? 'PR' : b.d}</Eyebrow>
          {b.isPR && <TText style={{ fontSize: 10, color: 'rgba(243,237,226,0.7)', marginBottom: 2 }}>{b.d}</TText>}
          <TText
            variant="monoMedium"
            style={{
              fontSize: 18,
              color: b.isPR ? c.paper : c.ink,
              marginTop: b.isPR ? 0 : 4,
              letterSpacing: -0.2
            }}
          >
            {b.t}
          </TText>
          <TText
            style={{
              fontSize: 9.5,
              marginTop: 4,
              color: b.isPR ? 'rgba(243,237,226,0.5)' : c.ink3
            }}
          >
            {b.date}
          </TText>
        </View>
      ))}
    </View>
  );
}

function RecapCarousel() {
  const c = useColors();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % RECAPS.length), 4200);
    return () => clearInterval(t);
  }, []);
  const r = RECAPS[idx];
  return (
    <View style={{ backgroundColor: c.paper2, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 18, overflow: 'hidden', minHeight: 130 }}>
      <View style={{ position: 'absolute', right: -30, top: -30, opacity: 0.06 }}>
        <SunMark size={140} />
      </View>
      <Eyebrow style={{ color: c.accent, marginBottom: 8 }}>{r.eyebrow}</Eyebrow>
      <TText variant="serif" style={{ fontSize: 18, color: c.ink2, lineHeight: 22 }}>{r.body}</TText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <TText variant="monoMedium" style={{ fontSize: 38, lineHeight: 38, letterSpacing: -0.8, color: c.ink }}>{String(r.num)}</TText>
        <TText style={{ fontSize: 14, color: c.ink3 }}>{r.suffix}</TText>
      </View>
      <TText style={{ fontSize: 12, color: c.ink3, marginTop: 8 }}>{r.detail}</TText>

      <View style={{ position: 'absolute', bottom: 14, right: 14, flexDirection: 'row', gap: 4 }}>
        {RECAPS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === idx ? 14 : 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: i === idx ? c.ink : c.line
            }}
          />
        ))}
      </View>
    </View>
  );
}

function ShoesWidget() {
  const c = useColors();
  const active = SHOES.filter((s) => !s.retired).slice(0, 3);
  return (
    <View style={{ gap: 8 }}>
      {active.map((s) => {
        const pct = Math.min(s.km / s.cap, 1);
        const warn = pct > 0.8;
        return (
          <View key={s.id} style={{
            backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', gap: 14
          }}>
            <View style={{
              width: 38, height: 38, borderRadius: 10, backgroundColor: s.color,
              opacity: s.primary ? 1 : 0.7, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: c.line
            }}>
              <Icon.shoe size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TText style={{ fontSize: 13, fontWeight: '500', color: c.ink }}>{s.model}</TText>
                {s.primary && <Eyebrow style={{ color: c.accent, fontSize: 9 }}>PRIMARY</Eyebrow>}
                {s.race && <Eyebrow style={{ color: c.ink3, fontSize: 9 }}>RACE</Eyebrow>}
              </View>
              <TText style={{ fontSize: 11, color: c.ink3, marginBottom: 6 }}>{s.brand}</TText>
              <View style={{ height: 4, backgroundColor: c.line, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: warn ? c.warn : c.ink }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{s.km}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>/ {s.cap} km</TText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PlacesPreview({ onOpen }: { onOpen: () => void }) {
  const c = useColors();
  const cities = PLACES.length;
  const countries = new Set(PLACES.map((p) => p.country)).size;
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        { backgroundColor: c.paper2, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 16, opacity: pressed ? 0.85 : 1 }
      ]}
    >
      <MiniWorldMap height={120} places={PLACES} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoMedium" style={{ fontSize: 30, letterSpacing: -0.6, color: c.ink, lineHeight: 32 }}>{cities}</TText>
            <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 6 }}>cities</TText>
            <TText style={{ color: c.line, marginHorizontal: 8 }}>·</TText>
            <TText variant="monoMedium" style={{ fontSize: 30, letterSpacing: -0.6, color: c.ink, lineHeight: 32 }}>{countries}</TText>
            <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 6 }}>countries</TText>
          </View>
          <TText style={{ fontSize: 12, color: c.ink3, marginTop: 4 }}>Latest: Tokyo · Jan ’26</TText>
        </View>
        <Icon.chevR size={18} color={c.ink3} />
      </View>
    </Pressable>
  );
}
