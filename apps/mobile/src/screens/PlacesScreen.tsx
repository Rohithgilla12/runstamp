import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { PLACES, type Place, distUnit } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Button, Card, Stat } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SectionHeader } from './HomeScreen';
import type { TabProps } from '../nav/types';

type Filter = 'all' | '2026' | 'india' | 'travel';

export function PlacesScreen(_props: TabProps<'Places'>) {
  const c = useColors();
  const { units } = useAppState();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Place | null>(null);

  const places =
    filter === '2026'   ? PLACES.filter((p) => p.first.startsWith('2026') || p.runs > 5) :
    filter === 'india'  ? PLACES.filter((p) => p.country === 'India') :
    filter === 'travel' ? PLACES.filter((p) => p.country !== 'India') :
    PLACES;

  const cities = places.length;
  const countries = new Set(places.map((p) => p.country)).size;
  const totalKm = places.reduce((a, p) => a + p.km, 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>PLACES</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
          <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.6 }}>Every city, </TText>
          <TText variant="serifItalic" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.6 }}>everywhere</TText>
          <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.6 }}>.</TText>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>CITIES</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 36, letterSpacing: -1, color: c.ink }}>{cities}</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow>COUNTRIES</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 24, lineHeight: 24, color: c.ink }}>{countries}</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow>{distUnit(units).toUpperCase()}</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 24, lineHeight: 24, color: c.ink }}>{totalKm.toLocaleString()}</TText>
        </View>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
        <View style={{ backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 16 }}>
          <WorldMap places={places} selected={selected} onSelect={setSelected} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {([
          ['all', 'All time'],
          ['2026', '2026'],
          ['india', 'India'],
          ['travel', 'Travel']
        ] as const).map(([id, l]) => (
          <Pressable key={id} onPress={() => setFilter(id)} style={{
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
            borderWidth: 1, borderColor: c.line,
            backgroundColor: filter === id ? c.ink : 'transparent'
          }}>
            <TText style={{ fontSize: 12, fontWeight: '500', color: filter === id ? c.paper : c.ink2 }}>{l}</TText>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="By distance" right={<TText style={{ fontSize: 13, color: c.ink2 }}>Sort  ▾</TText>} />
      <View style={{ paddingHorizontal: 14 }}>
        <Card padded={false}>
          {[...places].sort((a, b) => b.km - a.km).map((p, i, arr) => (
            <PlaceRow key={p.city} place={p} top={i === 0} index={i + 1} hasBorder={i > 0} onPress={() => setSelected(p)} />
          ))}
        </Card>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
        <Card style={{ backgroundColor: c.ink, borderColor: 'transparent' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.accent }}>SHARE</Eyebrow>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
                <TText variant="serif" style={{ fontSize: 18, color: c.paper, lineHeight: 20 }}>Make a </TText>
                <TText variant="serifItalic" style={{ fontSize: 18, color: c.paper, lineHeight: 20 }}>Places</TText>
                <TText variant="serif" style={{ fontSize: 18, color: c.paper, lineHeight: 20 }}> card.</TText>
              </View>
              <TText style={{ fontSize: 11, color: 'rgba(243,237,226,0.5)', marginTop: 4 }}>
                Beautiful 9:16 of every city you’ve run in.
              </TText>
            </View>
            <Icon.share size={22} color={c.accent} />
          </View>
        </Card>
      </View>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && <PlaceSheet place={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </ScrollView>
  );
}

function WorldMap({
  places,
  selected,
  onSelect
}: {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
}) {
  const c = useColors();
  const W = 370;
  const H = 220;
  const proj = (lat: number, lon: number) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H] as const;

  const dots: React.ReactNode[] = [];
  for (let col = 0; col < 38; col++) {
    for (let row = 0; row < 18; row++) {
      const x = (col + 0.5) * (W / 38);
      const y = (row + 0.5) * (H / 18);
      const lat = 90 - (y / H) * 180;
      const lon = (x / W) * 360 - 180;
      const land =
        (lat > 20 && lat < 70 && lon > -130 && lon < -60) ||
        (lat > -55 && lat < 10 && lon > -80 && lon < -35) ||
        (lat > 35 && lat < 70 && lon > -10 && lon < 40) ||
        (lat > -35 && lat < 35 && lon > -15 && lon < 50) ||
        (lat > 5 && lat < 55 && lon > 50 && lon < 140) ||
        (lat > -45 && lat < -10 && lon > 110 && lon < 155);
      if (land) dots.push(<Circle key={`${col}-${row}`} cx={x} cy={y} r={1.2} fill={c.ink3} opacity={0.32} />);
    }
  }

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {dots}
      {places.map((p) => {
        const [x, y] = proj(p.lat, p.lon);
        const r = Math.min(2 + Math.log10(Math.max(p.runs, 1)) * 4, 10);
        const isSel = selected?.city === p.city;
        return (
          <G key={p.city} onPress={() => onSelect(p)}>
            <Circle cx={x} cy={y} r={r + 6} fill={c.accent} opacity={isSel ? 0.35 : 0.18} />
            <Circle cx={x} cy={y} r={r} fill={c.accent} stroke={isSel ? '#fff' : undefined} strokeWidth={isSel ? 1.5 : 0} />
            {p.runs > 50 && (
              <SvgText x={x + r + 4} y={y + 3} fontSize={8} fill={c.ink2}>
                {p.city}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function PlaceRow({
  place,
  top,
  index,
  hasBorder,
  onPress
}: {
  place: Place;
  top: boolean;
  index: number;
  hasBorder: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderTopWidth: hasBorder ? 1 : 0, borderTopColor: c.line2,
      opacity: pressed ? 0.7 : 1
    }]}>
      <TText variant="mono" style={{ fontSize: 11, color: c.ink3, width: 18 }}>{String(index).padStart(2, '0')}</TText>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <TText style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>{place.city}</TText>
          {top && <Eyebrow style={{ color: c.accent, fontSize: 9 }}>HOME</Eyebrow>}
        </View>
        <TText style={{ fontSize: 11, color: c.ink3 }}>{place.country} · since {place.first.slice(0, 7)}</TText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{place.km.toLocaleString()}</TText>
          <TText style={{ fontSize: 10, color: c.ink3, marginLeft: 2 }}>{distUnit(units)}</TText>
        </View>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{place.runs} runs</TText>
      </View>
    </Pressable>
  );
}

function PlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.55)', justifyContent: 'flex-end' }}>
      <Pressable onPress={(e) => e.stopPropagation()} style={{
        backgroundColor: c.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36
      }}>
        <View style={{ width: 36, height: 4, backgroundColor: c.line, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />
        <Eyebrow style={{ color: c.accent }}>{place.country}</Eyebrow>
        <TText variant="serif" style={{ fontSize: 30, lineHeight: 30, letterSpacing: -0.6, color: c.ink, marginTop: 4 }}>{place.city}</TText>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 18 }}>
          <View style={{ flex: 1 }}><Stat label="DISTANCE" value={place.km.toLocaleString()} unit={distUnit(units)} size="md" /></View>
          <View style={{ flex: 1 }}><Stat label="RUNS"     value={place.runs}             size="md" /></View>
          <View style={{ flex: 1 }}><Stat label="SINCE"    value={place.first.slice(0, 4)} size="md" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          <View style={{ flex: 1 }}><Button kind="ghost" full onPress={onClose}>Close</Button></View>
          <View style={{ flex: 1 }}><Button kind="primary" full iconRight={<Icon.chevR size={16} color={c.paper} />}>View runs</Button></View>
        </View>
      </Pressable>
    </Pressable>
  );
}
