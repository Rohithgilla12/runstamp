import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACT,
  ALLTIME,
  BEST_EFFORTS_MONTH,
  MONTHLY_KM,
  PLACES,
  SHOES,
  STAMPS,
  fmtDist,
  fmtPace,
  fmtTime,
} from '../data/sample';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Button } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark, PostmarkMark } from '../design/SunMark';
import { StampBadge } from '../design/StampBadge';
import { MiniWorldMap, BarChart, Sparkline } from '../design/charts';
import type { RootStackProps } from '../nav/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const YEAR = 2026;

const yearStamps = STAMPS.filter(
  (s) => s.earnedAt && s.earnedAt.startsWith(String(YEAR))
);

const earnedCommon = yearStamps.filter((s) => s.tier === 'common').length;
const earnedRare = yearStamps.filter((s) => s.tier === 'rare').length;
const earnedMythic = yearStamps.filter((s) => s.tier === 'mythic').length;

const yearActivities = ACT.filter((a) => a.date.startsWith(String(YEAR)));

const longestRun = [...ACT].sort((a, b) => b.distance - a.distance)[0];

const newCities = PLACES.filter((p) => p.first.startsWith(String(YEAR)));

const yearKm = MONTHLY_KM.reduce((sum, m) => sum + m.km, 0);
const yearRuns = MONTHLY_KM.reduce((sum, m) => sum + m.runs, 0);

const primaryShoe =
  SHOES.find((s) => s.primary && !s.retired) ?? SHOES.find((s) => !s.retired) ?? SHOES[0];

const momentRun = longestRun;

const TOTAL_CARDS = 9;

export function YearInStampsScreen({ navigation }: RootStackProps<'YearInStamps'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  }

  function close() {
    navigation.goBack();
  }

  const cardStyle = {
    width: SCREEN_WIDTH,
    minHeight: '100%' as const,
  };

  const topOffset = insets.top + 52;
  const bottomOffset = insets.bottom + 24;

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}
      >
        <PageDots total={TOTAL_CARDS} active={activeIndex} />
        <Pressable
          onPress={close}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: c.paper2,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon.x size={16} color={c.ink2} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topOffset, paddingBottom: bottomOffset }}
      >
        <View style={cardStyle}>
          <DistanceCard yearKm={yearKm} yearRuns={yearRuns} />
        </View>
        <View style={cardStyle}>
          <StampsEarnedCard
            common={earnedCommon}
            rare={earnedRare}
            mythic={earnedMythic}
            stamps={yearStamps}
          />
        </View>
        <View style={cardStyle}>
          <CitiesCard cities={newCities} />
        </View>
        <View style={cardStyle}>
          <LongestRunCard run={longestRun} />
        </View>
        <View style={cardStyle}>
          <BestEffortsCard />
        </View>
        <View style={cardStyle}>
          <PaceEvolutionCard />
        </View>
        <View style={cardStyle}>
          <ShoeCard shoe={primaryShoe} />
        </View>
        <View style={cardStyle}>
          <MomentCard run={momentRun} />
        </View>
        <View style={cardStyle}>
          <CtaCard onClose={close} />
        </View>
      </ScrollView>
    </View>
  );
}

function PageDots({ total, active }: { total: number; active: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 16 : 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: i === active ? c.accent : c.line,
          }}
        />
      ))}
    </View>
  );
}

function CardShell({
  children,
  accentBg,
}: {
  children: React.ReactNode;
  accentBg?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: accentBg ? 'transparent' : c.line,
        backgroundColor: accentBg ? c.ink : c.paper,
        overflow: 'hidden',
        padding: 24,
      }}
    >
      {children}
    </View>
  );
}

function DistanceCard({ yearKm, yearRuns }: { yearKm: number; yearRuns: number }) {
  const c = useColors();
  return (
    <CardShell accentBg>
      <View style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.07 }}>
        <SunMark size={220} color={c.accent} />
      </View>

      <Eyebrow style={{ color: c.accent }}>RUNSTAMP · {YEAR}</Eyebrow>

      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 32 }}>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22, color: 'rgba(243,237,226,0.6)', lineHeight: 26 }}
        >
          You ran
        </TText>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
          <TText
            variant="monoMedium"
            style={{
              fontSize: 72,
              lineHeight: 72,
              letterSpacing: -2.8,
              color: c.paper,
            }}
          >
            {Math.round(yearKm).toLocaleString()}
          </TText>
          <TText
            style={{
              fontSize: 22,
              color: 'rgba(243,237,226,0.5)',
              marginLeft: 6,
              marginBottom: 8,
            }}
          >
            km
          </TText>
        </View>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22, color: 'rgba(243,237,226,0.6)', lineHeight: 26, marginTop: 4 }}
        >
          in {YEAR}.
        </TText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 0,
          borderTopWidth: 1,
          borderTopColor: 'rgba(243,237,226,0.12)',
          paddingTop: 16,
          marginTop: 'auto',
        }}
      >
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.45)' }}>RUNS</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 28, color: c.paper, marginTop: 2 }}>
            {yearRuns}
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.45)' }}>HOURS</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 28, color: c.paper, marginTop: 2 }}>
            {Math.round((yearKm * 330) / 3600)}
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.45)' }}>ELEVATION</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 28, color: c.paper, marginTop: 2 }}>
            {(ALLTIME.elev / 1000).toFixed(1)}k
          </TText>
          <TText style={{ fontSize: 10, color: 'rgba(243,237,226,0.4)', marginTop: 1 }}>m gained</TText>
        </View>
      </View>
    </CardShell>
  );
}

function StampsEarnedCard({
  common,
  rare,
  mythic,
  stamps,
}: {
  common: number;
  rare: number;
  mythic: number;
  stamps: typeof STAMPS;
}) {
  const c = useColors();
  const displayStamps = stamps.slice(0, 6);

  return (
    <CardShell>
      <Eyebrow style={{ color: c.accent }}>COLLECTION · {YEAR}</Eyebrow>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5 }}>
          Stamps{' '}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5, color: c.accent }}
        >
          earned
        </TText>
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5 }}>
          .
        </TText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 14,
          marginBottom: 20,
        }}
      >
        <TierPill label="COMMON" count={common} color={c.moss} />
        <TierPill label="RARE" count={rare} color={c.ink} />
        <TierPill label="MYTHIC" count={mythic} color={c.accent} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {displayStamps.map((s) => (
          <View key={s.id} style={{ alignItems: 'center', width: (SCREEN_WIDTH - 88) / 3 }}>
            <StampBadge id={`yis-${s.id}`} name={s.name} tier={s.tier} earned size={72} />
            <TText
              style={{
                fontSize: 10,
                color: c.ink2,
                marginTop: 4,
                textAlign: 'center',
                fontWeight: '500',
              }}
              numberOfLines={2}
            >
              {s.name}
            </TText>
          </View>
        ))}
      </View>

      {stamps.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <TText variant="serifItalic" style={{ fontSize: 18, color: c.ink3, textAlign: 'center' }}>
            No stamps earned this year yet.
          </TText>
          <TText style={{ fontSize: 13, color: c.ink3, marginTop: 6, textAlign: 'center' }}>
            Keep running — your first is close.
          </TText>
        </View>
      )}

      <View style={{ marginTop: 'auto', paddingTop: 16 }}>
        <TText style={{ fontSize: 12, color: c.ink3 }}>
          {common + rare + mythic} stamps earned in {YEAR} · {STAMPS.length} total in collection
        </TText>
      </View>
    </CardShell>
  );
}

function TierPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.line,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: c.paper2,
      }}
    >
      <Eyebrow style={{ color, fontSize: 9 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink, marginTop: 2 }}>
        {count}
      </TText>
    </View>
  );
}

function CitiesCard({ cities }: { cities: typeof PLACES }) {
  const c = useColors();
  const totalCities = PLACES.length;
  const totalCountries = new Set(PLACES.map((p) => p.country)).size;

  return (
    <CardShell>
      <Eyebrow style={{ color: c.accent }}>PLACES · {YEAR}</Eyebrow>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        <TText variant="monoMedium" style={{ fontSize: 56, lineHeight: 56, letterSpacing: -2 }}>
          {cities.length}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22, color: c.ink2, marginLeft: 10, marginBottom: 6 }}
        >
          new {cities.length === 1 ? 'city' : 'cities'}
        </TText>
      </View>

      <View
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.paper2,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <MiniWorldMap height={110} places={PLACES} />
      </View>

      {cities.length > 0 ? (
        <View style={{ gap: 8 }}>
          {cities.slice(0, 3).map((p, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: c.line2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon.pin size={12} color={c.accent} />
                <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>{p.city}</TText>
                <TText style={{ fontSize: 12, color: c.ink3 }}>{p.country}</TText>
              </View>
              <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>
                {p.first.slice(0, 7)}
              </TText>
            </View>
          ))}
        </View>
      ) : (
        <TText variant="serifItalic" style={{ fontSize: 16, color: c.ink3 }}>
          No new cities yet this year.
        </TText>
      )}

      <View
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: c.line2,
          flexDirection: 'row',
          gap: 16,
        }}
      >
        <View>
          <Eyebrow>LIFETIME CITIES</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 20, color: c.ink, marginTop: 2 }}>
            {totalCities}
          </TText>
        </View>
        <View>
          <Eyebrow>COUNTRIES</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 20, color: c.ink, marginTop: 2 }}>
            {totalCountries}
          </TText>
        </View>
      </View>
    </CardShell>
  );
}

function LongestRunCard({ run }: { run: (typeof ACT)[number] }) {
  const c = useColors();
  return (
    <CardShell accentBg>
      <View style={{ position: 'absolute', left: -30, top: -30, opacity: 0.06 }}>
        <PostmarkMark size={200} color={c.accent} />
      </View>

      <Eyebrow style={{ color: 'rgba(243,237,226,0.5)' }}>LONGEST RUN · {YEAR}</Eyebrow>

      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
        <TText
          variant="serifItalic"
          style={{ fontSize: 18, color: 'rgba(243,237,226,0.55)', lineHeight: 22 }}
        >
          You went the furthest on
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 22, color: c.paper, lineHeight: 26, marginTop: 2 }}
        >
          {run.title}
        </TText>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 20 }}>
          <TText
            variant="monoMedium"
            style={{ fontSize: 80, lineHeight: 80, letterSpacing: -3, color: c.paper }}
          >
            {fmtDist(run.distance, 'km')}
          </TText>
          <TText
            style={{ fontSize: 20, color: 'rgba(243,237,226,0.5)', marginLeft: 6, marginBottom: 10 }}
          >
            km
          </TText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Icon.pin size={12} color={c.accent} />
          <TText style={{ fontSize: 13, color: 'rgba(243,237,226,0.65)' }}>{run.place}</TText>
        </View>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: 'rgba(243,237,226,0.12)',
          paddingTop: 16,
          flexDirection: 'row',
          gap: 0,
        }}
      >
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>TIME</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 18, color: c.paper, marginTop: 2 }}>
            {fmtTime(run.seconds)}
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>PACE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 18, color: c.paper, marginTop: 2 }}>
            {fmtPace(run.pace)}
          </TText>
          <TText style={{ fontSize: 10, color: 'rgba(243,237,226,0.4)', marginTop: 1 }}>/km</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>ELEV</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 18, color: c.paper, marginTop: 2 }}>
            {run.elev}m
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>DATE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 18, color: c.paper, marginTop: 2 }}>
            {run.date.slice(5)}
          </TText>
        </View>
      </View>
    </CardShell>
  );
}

function BestEffortsCard() {
  const c = useColors();
  const efforts = [
    { d: '1K',  t: '3:42',    date: 'Jan 14', pr: true  },
    { d: '5K',  t: '20:52',   date: 'Apr 12', pr: true  },
    { d: '10K', t: '44:32',   date: 'May 10', pr: false },
    { d: 'HM',  t: '1:38:44', date: 'Jan 19', pr: true  },
    { d: 'M',   t: '3:32:18', date: 'Jan 21', pr: false },
  ];

  return (
    <CardShell>
      <Eyebrow style={{ color: c.accent }}>BEST EFFORTS · {YEAR}</Eyebrow>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5 }}>
          Personal{' '}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5, color: c.accent }}
        >
          records
        </TText>
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5 }}>
          .
        </TText>
      </View>

      <View style={{ gap: 10 }}>
        {efforts.map((e, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 12,
              padding: 14,
              backgroundColor: e.pr ? c.ink : c.paper2,
              borderWidth: 1,
              borderColor: e.pr ? 'transparent' : c.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: e.pr ? c.accent : c.ink3, fontSize: 9 }}>
                {e.pr ? 'PR · ' : ''}{e.d}
              </Eyebrow>
              <TText
                variant="monoMedium"
                style={{ fontSize: 22, color: e.pr ? c.paper : c.ink, marginTop: 2, letterSpacing: -0.4 }}
              >
                {e.t}
              </TText>
            </View>
            <TText style={{ fontSize: 12, color: e.pr ? 'rgba(243,237,226,0.5)' : c.ink3 }}>
              {e.date}
            </TText>
            {e.pr && (
              <View style={{ marginLeft: 10 }}>
                <Icon.spark size={16} color={c.accent} />
              </View>
            )}
          </View>
        ))}
      </View>
    </CardShell>
  );
}

function PaceEvolutionCard() {
  const c = useColors();
  const monthlyPace = MONTHLY_KM.map((m, i) => {
    const basePace = [340, 335, 332, 330, 328][i] ?? 330;
    return basePace;
  });
  const paceLabels = MONTHLY_KM.map((m) => m.m);

  return (
    <CardShell>
      <Eyebrow style={{ color: c.accent }}>PACE EVOLUTION · {YEAR}</Eyebrow>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5 }}>
          Getting{' '}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5, color: c.moss }}
        >
          faster
        </TText>
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.5 }}>
          .
        </TText>
      </View>

      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.paper2,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Sparkline
          data={monthlyPace}
          width={SCREEN_WIDTH - 96}
          height={80}
          color={c.accent}
          strokeWidth={2.5}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          {paceLabels.map((label, i) => (
            <TText key={i} variant="mono" style={{ fontSize: 9, color: c.ink3 }}>
              {label}
            </TText>
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {MONTHLY_KM.map((m, i) => {
          const paceSec = monthlyPace[i];
          const paceMin = Math.floor(paceSec / 60);
          const paceSecs = paceSec % 60;
          const paceStr = `${paceMin}:${String(paceSecs).padStart(2, '0')}`;
          const barWidth = ((360 - paceSec) / (360 - 325)) * 100;

          return (
            <View key={i} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{m.m}</TText>
                <TText variant="monoMedium" style={{ fontSize: 13, color: c.ink }}>{paceStr}/km</TText>
              </View>
              <View style={{ height: 4, backgroundColor: c.line, borderRadius: 2, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.max(10, Math.min(barWidth, 100))}%`,
                    height: 4,
                    backgroundColor: c.accent,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 16 }}>
        <TText style={{ fontSize: 12, color: c.ink3, lineHeight: 18 }}>
          Average pace improved by{' '}
          <TText variant="mono" style={{ color: c.moss, fontSize: 12 }}>12 sec/km</TText>{' '}
          over the year.
        </TText>
      </View>
    </CardShell>
  );
}

function ShoeCard({ shoe }: { shoe: (typeof SHOES)[number] }) {
  const c = useColors();
  const pct = Math.min(shoe.km / shoe.cap, 1);

  return (
    <CardShell>
      <Eyebrow style={{ color: c.accent }}>MOST-WORN SHOE · {YEAR}</Eyebrow>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <TText variant="serif" style={{ fontSize: 24, lineHeight: 26, letterSpacing: -0.4 }}>
          Your{' '}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 24, lineHeight: 26, letterSpacing: -0.4, color: c.ink }}
        >
          workhorse
        </TText>
        <TText variant="serif" style={{ fontSize: 24, lineHeight: 26, letterSpacing: -0.4 }}>
          .
        </TText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: shoe.color,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <Icon.shoe size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <TText style={{ fontSize: 18, fontWeight: '600', color: c.ink, letterSpacing: -0.3 }}>
            {shoe.model}
          </TText>
          <TText style={{ fontSize: 14, color: c.ink3, marginTop: 2 }}>{shoe.brand}</TText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            {shoe.primary && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: c.accent,
                }}
              >
                <TText style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>PRIMARY</TText>
              </View>
            )}
            {shoe.race && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <TText style={{ fontSize: 10, color: c.ink3, fontWeight: '600' }}>RACE</TText>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Eyebrow>KM LOGGED</Eyebrow>
          <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>
            {shoe.km} / {shoe.cap} km
          </TText>
        </View>
        <View style={{ height: 8, backgroundColor: c.line, borderRadius: 4, overflow: 'hidden' }}>
          <View
            style={{
              width: `${pct * 100}%`,
              height: 8,
              backgroundColor: pct > 0.8 ? c.warn : c.accent,
              borderRadius: 4,
            }}
          />
        </View>
        <TText style={{ fontSize: 11, color: c.ink3, marginTop: 6 }}>
          {Math.round((1 - pct) * shoe.cap)} km remaining before retirement
        </TText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 0,
          borderTopWidth: 1,
          borderTopColor: c.line2,
          paddingTop: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Eyebrow>IN ROTATION SINCE</Eyebrow>
          <TText variant="mono" style={{ fontSize: 13, color: c.ink, marginTop: 3 }}>
            {shoe.since}
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow>MILEAGE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
            <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink }}>
              {shoe.km}
            </TText>
            <TText style={{ fontSize: 11, color: c.ink3, marginLeft: 4 }}>km</TText>
          </View>
        </View>
      </View>
    </CardShell>
  );
}

function MomentCard({ run }: { run: (typeof ACT)[number] }) {
  const c = useColors();
  return (
    <CardShell accentBg>
      <View style={{ position: 'absolute', right: -40, top: -40, opacity: 0.07 }}>
        <SunMark size={240} color={c.paper} />
      </View>

      <Eyebrow style={{ color: c.accent }}>MOMENT OF THE YEAR · {YEAR}</Eyebrow>

      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 28 }}>
        <TText
          variant="serifItalic"
          style={{
            fontSize: 34,
            lineHeight: 40,
            color: c.paper,
            letterSpacing: -0.8,
            maxWidth: SCREEN_WIDTH - 88,
          }}
        >
          {run.title}
        </TText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <Icon.pin size={14} color={c.accent} />
          <TText style={{ fontSize: 14, color: 'rgba(243,237,226,0.65)' }}>{run.place}</TText>
        </View>
        <TText
          variant="mono"
          style={{ fontSize: 12, color: 'rgba(243,237,226,0.45)', marginTop: 4 }}
        >
          {run.date} · {run.time}
        </TText>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: 'rgba(243,237,226,0.12)',
          paddingTop: 16,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>DISTANCE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              <TText variant="monoMedium" style={{ fontSize: 24, color: c.paper }}>
                {fmtDist(run.distance, 'km')}
              </TText>
              <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.4)', marginLeft: 4 }}>km</TText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>PACE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              <TText variant="monoMedium" style={{ fontSize: 24, color: c.paper }}>
                {fmtPace(run.pace)}
              </TText>
              <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.4)', marginLeft: 4 }}>/km</TText>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>HEART RATE</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 18, color: c.paper, marginTop: 2 }}>
              {run.avgHr}
              <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.4)' }}> avg</TText>
            </TText>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.4)' }}>CALORIES</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 18, color: c.paper, marginTop: 2 }}>
              {run.cal}
              <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.4)' }}> kcal</TText>
            </TText>
          </View>
        </View>
      </View>
    </CardShell>
  );
}

function CtaCard({ onClose }: { onClose: () => void }) {
  const c = useColors();
  const totalEarned = STAMPS.filter((s) => !!s.earnedAt).length;

  return (
    <CardShell>
      <View style={{ position: 'absolute', right: -20, top: -20, opacity: 0.06 }}>
        <SunMark size={200} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 }}>
        <PostmarkMark size={72} color={c.accent} />

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Eyebrow style={{ color: c.accent, textAlign: 'center' }}>
            RUNSTAMP · {YEAR} ALBUM
          </Eyebrow>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              marginTop: 10,
              justifyContent: 'center',
            }}
          >
            <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.5, textAlign: 'center' }}>
              Your{' '}
            </TText>
            <TText
              variant="serifItalic"
              style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.5, color: c.accent }}
            >
              {YEAR}
            </TText>
            <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.5, textAlign: 'center' }}>
              {' '}in stamps.
            </TText>
          </View>
          <TText
            style={{
              fontSize: 13,
              color: c.ink3,
              marginTop: 8,
              textAlign: 'center',
              lineHeight: 20,
              maxWidth: 260,
            }}
          >
            {totalEarned} stamps earned · {PLACES.length} cities stamped.{'\n'}
            A year worth keeping.
          </TText>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginTop: 32,
            borderTopWidth: 1,
            borderTopColor: c.line2,
            paddingTop: 24,
            width: '100%',
          }}
        >
          <View style={{ flex: 1 }}>
            <TText style={{ fontSize: 11, color: c.ink3, textAlign: 'center', marginBottom: 6 }}>
              Save album
            </TText>
            <Button
              kind="ghost"
              icon={<Icon.download size={16} color={c.ink} />}
              full
            >
              Save to Photos
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <TText style={{ fontSize: 11, color: c.ink3, textAlign: 'center', marginBottom: 6 }}>
              Share story
            </TText>
            <Button
              kind="accent"
              icon={<Icon.share size={16} color="#fff" />}
              full
            >
              Stories
            </Button>
          </View>
        </View>

        <TText
          style={{
            fontSize: 10,
            color: c.ink3,
            textAlign: 'center',
            marginTop: 10,
            lineHeight: 16,
            opacity: 0.7,
          }}
        >
          Export pipeline is wired — album-specific multi-card export coming soon.
        </TText>
      </View>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => ({
          marginTop: 8,
          paddingVertical: 12,
          alignItems: 'center' as const,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <TText style={{ fontSize: 13, color: c.ink3 }}>Close album</TText>
      </Pressable>
    </CardShell>
  );
}
