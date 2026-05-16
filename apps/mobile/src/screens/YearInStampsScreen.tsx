import React, { useMemo, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { SunMark } from '../design/SunMark';
import { Icon } from '../design/Icon';
import { useActivities } from '../state/useActivities';
import { useStamps } from '../state/useStamps';
import { useBestEfforts } from '../state/useBestEfforts';
import { useAppState } from '../state/AppState';
import { distUnit, fmtDist, fmtTime, type Activity } from '../data/sample';
import { computeStreaks } from '../analytics/streaks';
import { countContinents } from '../design/worldGeometry';
import type { RootStackProps } from '../nav/types';

// PRD §6.7: a multi-page swipeable recap of the year — total distance,
// stamps earned, new cities, longest run, best efforts, moment of the
// year. Designed to be the most-shared artifact Runstamp produces all
// year. This screen builds the card stack from live data; the user
// swipes horizontally between pages.

interface YearStats {
  totalKm: number;
  totalRuns: number;
  totalSec: number;
  elevM: number;
  stampsByTier: { common: number; rare: number; mythic: number };
  newCities: number;
  countries: number;
  continents: number;
  longestRunKm: number;
  longestRunDate: string | null;
  longestStreak: number;
  bestEffortsThisYear: { label: string; timeSeconds: number }[];
  momentOfYear: Activity | null;
}

export function YearInStampsScreen({ navigation }: RootStackProps<'YearInStamps'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units } = useAppState();
  const { activities } = useActivities();
  const { earned } = useStamps();
  const { efforts } = useBestEfforts();
  const screenW = Dimensions.get('window').width;

  const year = new Date().getFullYear();
  const stats = useMemo(() => computeYearStats(activities, earned, efforts, year), [activities, earned, efforts, year]);

  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / screenW);
    if (p !== page) setPage(p);
  };

  const pages: PageContent[] = useMemo(
    () => buildPages(stats, year, units),
    [stats, year, units],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.ink }}>
      <LinearGradient
        colors={['rgba(232,93,47,0.18)', 'rgba(14,13,11,1)']}
        locations={[0, 0.55]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ position: 'absolute', right: -60, top: 80, opacity: 0.06 }}>
        <SunMark size={320} />
      </View>

      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow style={{ color: c.accent }}>{year} · YEAR IN STAMPS</Eyebrow>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: 'rgba(243,237,226,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon.x size={16} color={c.paper} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ flex: 1 }}
      >
        {pages.map((pg, i) => (
          <YearCard key={i} content={pg} width={screenW} />
        ))}
      </ScrollView>

      {/* Page indicator dots */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16) + 6,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {pages.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === page ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === page ? c.accent : 'rgba(243,237,226,0.25)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ── Pages ────────────────────────────────────────────────────────────────

interface PageContent {
  eyebrow: string;
  title: string;
  titleItalic?: string;
  bigNumber?: string;
  bigUnit?: string;
  body?: string;
  secondaryRows?: { label: string; value: string }[];
  empty?: boolean;
}

function YearCard({ content, width }: { content: PageContent; width: number }) {
  const c = useColors();
  return (
    <View style={{ width, paddingHorizontal: 32, paddingTop: 28, paddingBottom: 12, justifyContent: 'center' }}>
      <Eyebrow style={{ color: 'rgba(243,237,226,0.55)' }}>{content.eyebrow}</Eyebrow>
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
        <TText variant="serif" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8, color: c.paper }}>{content.title}</TText>
        {content.titleItalic ? (
          <TText variant="serifItalic" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.8, color: c.paper }}>{content.titleItalic}</TText>
        ) : null}
      </View>
      {content.bigNumber ? (
        <View style={{ marginTop: 28, flexDirection: 'row', alignItems: 'baseline' }}>
          <TText variant="monoMedium" style={{ fontSize: 96, lineHeight: 112, letterSpacing: -3.2, color: c.paper }}>
            {content.bigNumber}
          </TText>
          {content.bigUnit ? (
            <TText style={{ fontSize: 18, color: 'rgba(243,237,226,0.55)', marginLeft: 6 }}>{content.bigUnit}</TText>
          ) : null}
        </View>
      ) : null}
      {content.body ? (
        <TText style={{ fontSize: 14, lineHeight: 20, color: 'rgba(243,237,226,0.7)', marginTop: 16 }}>
          {content.body}
        </TText>
      ) : null}
      {content.secondaryRows && content.secondaryRows.length > 0 ? (
        <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(243,237,226,0.12)', paddingTop: 14, gap: 10 }}>
          {content.secondaryRows.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 11 }}>{r.label}</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.paper }}>{r.value}</TText>
            </View>
          ))}
        </View>
      ) : null}
      {content.empty ? (
        <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.5)', marginTop: 20, fontStyle: 'italic' }}>
          Not enough runs this year yet — come back as your data fills in.
        </TText>
      ) : null}
    </View>
  );
}

function buildPages(stats: YearStats, year: number, units: 'km' | 'mi'): PageContent[] {
  if (stats.totalRuns === 0) {
    return [
      {
        eyebrow: 'COVER',
        title: 'Your ',
        titleItalic: `${year}`,
        body: 'No runs logged yet this year. Connect Strava or Apple Health to start your album.',
        empty: true,
      },
    ];
  }

  const pages: PageContent[] = [
    // 1. Cover
    {
      eyebrow: 'YOUR RUNSTAMP ALBUM',
      title: 'A year, ',
      titleItalic: 'stamped.',
      body: `${stats.totalRuns} runs · ${stats.countries} ${stats.countries === 1 ? 'country' : 'countries'} · ${stats.continents} ${stats.continents === 1 ? 'continent' : 'continents'}`,
    },
    // 2. Distance
    {
      eyebrow: `${year} · DISTANCE`,
      title: 'You ran ',
      titleItalic: 'a lot.',
      bigNumber: fmtDist(stats.totalKm, units),
      bigUnit: distUnit(units),
      secondaryRows: [
        { label: 'RUNS', value: String(stats.totalRuns) },
        { label: 'TIME', value: fmtTime(stats.totalSec) },
        { label: 'ELEVATION', value: `${Math.round(stats.elevM).toLocaleString()} m` },
      ],
    },
    // 3. Stamps
    {
      eyebrow: `${year} · STAMPS`,
      title: 'Earned ',
      titleItalic: `${stats.stampsByTier.common + stats.stampsByTier.rare + stats.stampsByTier.mythic}`,
      bigNumber: String(stats.stampsByTier.common + stats.stampsByTier.rare + stats.stampsByTier.mythic),
      bigUnit: 'stamps',
      secondaryRows: [
        { label: 'COMMON', value: String(stats.stampsByTier.common) },
        { label: 'RARE', value: String(stats.stampsByTier.rare) },
        { label: 'MYTHIC', value: String(stats.stampsByTier.mythic) },
      ],
    },
    // 4. Cities
    {
      eyebrow: `${year} · PLACES`,
      title: `${stats.newCities} ${stats.newCities === 1 ? 'city' : 'cities'}, `,
      titleItalic: stats.continents === 1 ? '1 continent.' : `${stats.continents} continents.`,
      bigNumber: String(stats.newCities),
      bigUnit: stats.newCities === 1 ? 'city stamped' : 'cities stamped',
      secondaryRows: [
        { label: 'COUNTRIES', value: String(stats.countries) },
        { label: 'CONTINENTS', value: String(stats.continents) },
      ],
    },
    // 5. Longest run
    {
      eyebrow: `${year} · LONGEST RUN`,
      title: 'Your ',
      titleItalic: 'biggest day.',
      bigNumber: fmtDist(stats.longestRunKm, units),
      bigUnit: distUnit(units),
      body: stats.longestRunDate ? `Run on ${formatLongDate(stats.longestRunDate)}` : undefined,
    },
    // 6. Streak (only if non-trivial)
    ...(stats.longestStreak >= 3
      ? [{
        eyebrow: `${year} · DISCIPLINE`,
        title: 'Longest ',
        titleItalic: 'streak.',
        bigNumber: String(stats.longestStreak),
        bigUnit: stats.longestStreak === 1 ? 'day in a row' : 'days in a row',
      }]
      : []),
    // 7. Best efforts
    ...(stats.bestEffortsThisYear.length > 0
      ? [{
        eyebrow: `${year} · BEST EFFORTS`,
        title: 'Your ',
        titleItalic: 'personal bests.',
        secondaryRows: stats.bestEffortsThisYear.map((e) => ({
          label: e.label.toUpperCase(),
          value: fmtTime(e.timeSeconds),
        })),
      }]
      : []),
    // 8. Closing
    {
      eyebrow: 'NEXT YEAR',
      title: 'See you on the ',
      titleItalic: 'roads.',
      body: 'Share this album — the only year-end recap that lives on the trail you actually ran.',
    },
  ];

  return pages;
}

// ── Stats computation ────────────────────────────────────────────────────

function computeYearStats(
  activities: Activity[],
  earned: { tier: string; earnedAt?: string }[],
  efforts: { label: string; timeSeconds: number; achievedAt: string }[],
  year: number,
): YearStats {
  const yearPrefix = `${year}-`;
  const yearRuns = activities.filter((a) => a.date.startsWith(yearPrefix));
  let totalKm = 0;
  let totalSec = 0;
  let elevM = 0;
  let longestRunKm = 0;
  let longestRunDate: string | null = null;
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const r of yearRuns) {
    totalKm += r.distance;
    totalSec += r.seconds;
    elevM += r.elev;
    if (r.distance > longestRunKm) {
      longestRunKm = r.distance;
      longestRunDate = r.date;
    }
    if (r.city?.trim()) cities.add(r.city.trim());
    if (r.country?.trim()) countries.add(r.country.trim());
  }
  const stampsByTier = { common: 0, rare: 0, mythic: 0 };
  for (const e of earned) {
    if (!e.earnedAt?.startsWith(yearPrefix)) continue;
    if (e.tier === 'common') stampsByTier.common += 1;
    else if (e.tier === 'rare') stampsByTier.rare += 1;
    else if (e.tier === 'mythic') stampsByTier.mythic += 1;
  }
  const bestEffortsThisYear = efforts.filter((e) => e.achievedAt.startsWith(yearPrefix));
  const continents = countContinents([...countries]);

  return {
    totalKm,
    totalRuns: yearRuns.length,
    totalSec,
    elevM,
    stampsByTier,
    newCities: cities.size,
    countries: countries.size,
    continents,
    longestRunKm,
    longestRunDate,
    longestStreak: computeStreaks(yearRuns).longest,
    bestEffortsThisYear: bestEffortsThisYear.map((e) => ({ label: e.label, timeSeconds: e.timeSeconds })),
    momentOfYear: null,
  };
}

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}
