import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { SunMark } from '../design/SunMark';
import { Icon } from '../design/Icon';
import { StampBadge } from '../design/StampBadge';
import { RouteMap } from '../design/RouteMap';
import { YearInStampsCard, YIS_CARD_HEIGHT, YIS_CARD_WIDTH } from '../design/YearInStampsCard';
import { VideoExportModal } from './share/VideoExportModal';
import { shareExportedVideo } from '../services/videoExport';
import { useActivities } from '../state/useActivities';
import { useActivityStreams } from '../state/useActivityStreams';
import { useStamps, type CatalogStamp } from '../state/useStamps';
import { useAppState } from '../state/AppState';
import type { Activity } from '../data/models';
import { distUnit, fmtDist } from '../lib/format';
import { countContinents } from '../design/worldGeometry';
import type { RootStackProps } from '../nav/types';

// "Year in Stamps" — a paginated, scroll-driven recap. Five panels:
//   1. Cover     — typographic reveal of the year
//   2. Tally     — km / runs / cities count-up
//   3. Stamps    — earned stamps land one by one
//   4. Top Run   — the year's biggest day, route + numbers
//   5. Sealed    — wax-seal closing card
//
// Each panel animates when it comes into view (so swiping back up replays
// the entrance — keeps the page alive). All animations honor Reduce Motion
// and snap to their resting state when it's enabled.

const PAGE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

// ── Screen ───────────────────────────────────────────────────────────────

export function YearInStampsScreen({ navigation }: RootStackProps<'YearInStamps'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units } = useAppState();
  const { activities } = useActivities();
  const { earned } = useStamps();
  const screenW = Dimensions.get('window').width;
  const screenH = Dimensions.get('window').height;

  const year = new Date().getFullYear();
  const stats = useMemo(() => computeYearStats(activities, earned, year), [activities, earned, year]);
  const earnedThisYear = useMemo(
    () => earned.filter((e) => e.earnedAt?.startsWith(`${year}-`)),
    [earned, year],
  );
  const topRun = useMemo(
    () => (stats.longestRunDate ? activities.find((a) => a.date === stats.longestRunDate) ?? null : null),
    [activities, stats.longestRunDate],
  );

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduceMotion(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.y / screenH);
    if (p !== page) setPage(p);
  };

  const [videoExporting, setVideoExporting] = useState(false);

  const pages = useMemo(() => {
    const arr: PageKind[] = ['cover', 'tally', 'stamps', 'topRun', 'sealed'];
    return arr;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.ink }}>
      <LinearGradient
        colors={['rgba(232,93,47,0.16)', 'rgba(14,13,11,1)']}
        locations={[0, 0.55]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ position: 'absolute', right: -80, top: 60, opacity: 0.05 }}>
        <SunMark size={360} />
      </View>

      <ScrollView
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={{ flex: 1 }}
      >
        {pages.map((kind, i) => (
          <View key={kind} style={{ width: screenW, height: screenH }}>
            <Panel
              kind={kind}
              active={page === i}
              reduceMotion={reduceMotion}
              year={year}
              stats={stats}
              earnedThisYear={earnedThisYear}
              topRun={topRun}
              units={units}
              insetsTop={insets.top}
            />
          </View>
        ))}
      </ScrollView>

      {/* Floating header — close + eyebrow. Sits above all panels. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 18,
          right: 18,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Eyebrow style={{ color: c.accent, letterSpacing: 1.4 }}>{year} · YEAR IN STAMPS</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setVideoExporting(true)}
            hitSlop={10}
            accessibilityLabel="Export Year in Stamps as video"
            disabled={videoExporting}
            style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: 'rgba(232,93,47,0.85)',
              alignItems: 'center', justifyContent: 'center',
              opacity: videoExporting ? 0.5 : 1,
            }}
          >
            <Icon.play size={13} color={c.paper} />
          </Pressable>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: 'rgba(243,237,226,0.10)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon.x size={15} color={c.paper} />
          </Pressable>
        </View>
      </View>

      {/* Gated — YearInStampsCard's stamp grid + animations would render
          off-screen on every re-render of this screen if mounted always.
          Scale=3 renders the card at 1080×1920 so Stories playback is
          crisp instead of upscaling a 360×640 source. */}
      {videoExporting && (
        <VideoExportModal
          visible
          dims={{ width: YIS_CARD_WIDTH * 3, height: YIS_CARD_HEIGHT * 3 }}
          renderFrame={(p) => (
            <YearInStampsCard
              year={year}
              stats={stats}
              earnedThisYear={earnedThisYear}
              units={units}
              progress={p}
              scale={3}
            />
          )}
          onCancel={() => setVideoExporting(false)}
          onComplete={async (uri) => {
            setVideoExporting(false);
            try {
              await shareExportedVideo(uri, `My ${year} in stamps via Runstamp`);
            } catch (e) {
              Alert.alert("Couldn’t share", e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}

      {/* Vertical page indicator — right edge, mid-screen. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 12,
          top: screenH / 2 - (pages.length * 14) / 2,
          gap: 8,
          alignItems: 'center',
        }}
      >
        {pages.map((_, i) => (
          <View
            key={i}
            style={{
              width: 4,
              height: i === page ? 16 : 4,
              borderRadius: 2,
              backgroundColor: i === page ? c.accent : 'rgba(243,237,226,0.25)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ── Panel router ─────────────────────────────────────────────────────────

type PageKind = 'cover' | 'tally' | 'stamps' | 'topRun' | 'sealed';

interface PanelProps {
  kind: PageKind;
  active: boolean;
  reduceMotion: boolean;
  year: number;
  stats: YearStats;
  earnedThisYear: CatalogStamp[];
  topRun: Activity | null;
  units: 'km' | 'mi';
  insetsTop: number;
}

function Panel(props: PanelProps) {
  switch (props.kind) {
    case 'cover':  return <CoverPanel {...props} />;
    case 'tally':  return <TallyPanel {...props} />;
    case 'stamps': return <StampsPanel {...props} />;
    case 'topRun': return <TopRunPanel {...props} />;
    case 'sealed': return <SealedPanel {...props} />;
  }
}

// ── Cover ────────────────────────────────────────────────────────────────

function CoverPanel({ active, reduceMotion, year, stats }: PanelProps) {
  const c = useColors();
  // Three lines reveal in sequence with a gentle rise.
  const l0 = useSharedValue(reduceMotion ? 1 : 0);
  const l1 = useSharedValue(reduceMotion ? 1 : 0);
  const l2 = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      l0.value = 1; l1.value = 1; l2.value = 1;
      return;
    }
    const run = (s: typeof l0, delay: number) => {
      s.value = 0;
      s.value = withDelay(delay, withTiming(1, { duration: 620, easing: PAGE_EASE }));
    };
    run(l0, 0);
    run(l1, 130);
    run(l2, 260);
  }, [active, reduceMotion, l0, l1, l2]);

  const style0 = useAnimatedStyle(() => ({ opacity: l0.value, transform: [{ translateY: 18 * (1 - l0.value) }] }));
  const style1 = useAnimatedStyle(() => ({ opacity: l1.value, transform: [{ translateY: 18 * (1 - l1.value) }] }));
  const style2 = useAnimatedStyle(() => ({ opacity: l2.value, transform: [{ translateY: 18 * (1 - l2.value) }] }));
  const styles = [style0, style1, style2];

  return (
    <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center' }}>
      <Animated.View style={styles[0]}>
        <TText variant="serif" style={{ fontSize: 22, color: 'rgba(243,237,226,0.65)', lineHeight: 26 }}>
          Your year,
        </TText>
      </Animated.View>
      <Animated.View style={styles[1]}>
        <TText variant="serifItalic" style={{ fontSize: 88, lineHeight: 92, letterSpacing: -2.8, color: c.paper, marginTop: 6 }}>
          stamped.
        </TText>
      </Animated.View>
      <Animated.View style={[styles[2], { marginTop: 28, flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }]}>
        <TText variant="mono" style={{ fontSize: 13, color: c.accent, letterSpacing: 1.4 }}>{year}</TText>
        <TText style={{ fontSize: 13, color: 'rgba(243,237,226,0.55)' }}>·</TText>
        <TText style={{ fontSize: 14, color: 'rgba(243,237,226,0.75)' }}>
          {stats.totalRuns} {stats.totalRuns === 1 ? 'run' : 'runs'} · {stats.countries} {stats.countries === 1 ? 'country' : 'countries'}
        </TText>
      </Animated.View>

      <Animated.View style={[styles[2], { position: 'absolute', bottom: 70, left: 32, right: 32, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
        <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 10 }}>SWIPE</Eyebrow>
        <Svg width={12} height={8} viewBox="0 0 12 8">
          <Path d="M1 1l5 5 5-5" stroke="rgba(243,237,226,0.5)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Tally (count-up) ─────────────────────────────────────────────────────

function TallyPanel({ active, reduceMotion, stats, units }: PanelProps) {
  const c = useColors();
  const totalDist = Number(fmtDist(stats.totalKm, units));

  return (
    <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center' }}>
      <Eyebrow style={{ color: 'rgba(243,237,226,0.55)' }}>THE LEDGER</Eyebrow>
      <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, color: c.paper, marginTop: 10 }}>
        What you <TText variant="serifItalic" style={{ fontSize: 28, color: c.paper }}>posted.</TText>
      </TText>

      <View style={{ marginTop: 44, gap: 32 }}>
        <TallyRow
          label="TOTAL"
          unit={distUnit(units)}
          to={totalDist}
          decimals={1}
          active={active}
          reduceMotion={reduceMotion}
          delay={0}
        />
        <TallyRow
          label="RUNS"
          to={stats.totalRuns}
          decimals={0}
          active={active}
          reduceMotion={reduceMotion}
          delay={180}
        />
        <TallyRow
          label="CITIES"
          to={stats.newCities}
          decimals={0}
          active={active}
          reduceMotion={reduceMotion}
          delay={360}
        />
      </View>
    </View>
  );
}

function TallyRow({
  label,
  unit,
  to,
  decimals,
  active,
  reduceMotion,
  delay,
}: {
  label: string;
  unit?: string;
  to: number;
  decimals: number;
  active: boolean;
  reduceMotion: boolean;
  delay: number;
}) {
  const c = useColors();
  const [value, setValue] = useState(reduceMotion ? to : 0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      setValue(to);
      return;
    }
    setValue(0);
    timeoutRef.current = setTimeout(() => {
      const start = performance.now();
      const duration = 1100;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // ease-out-quint
        const eased = 1 - Math.pow(1 - t, 5);
        setValue(to * eased);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
    };
  }, [active, reduceMotion, to, delay]);

  const display = decimals === 0
    ? Math.round(value).toLocaleString()
    : value.toFixed(decimals);

  return (
    <View>
      <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 10, letterSpacing: 1.4 }}>{label}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 76, lineHeight: 84, letterSpacing: -2.4, color: c.paper }}>
          {display}
        </TText>
        {unit ? (
          <TText style={{ fontSize: 16, color: 'rgba(243,237,226,0.55)', marginLeft: 6 }}>{unit}</TText>
        ) : null}
      </View>
    </View>
  );
}

// ── Stamps grid ──────────────────────────────────────────────────────────

function StampsPanel({ active, reduceMotion, earnedThisYear }: PanelProps) {
  const c = useColors();
  const visible = earnedThisYear.slice(0, 12);
  const overflow = Math.max(0, earnedThisYear.length - visible.length);

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', paddingHorizontal: 8 }}>EARNED</Eyebrow>
      <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, color: c.paper, paddingHorizontal: 8, marginTop: 8 }}>
        {earnedThisYear.length}{' '}
        <TText variant="serifItalic" style={{ fontSize: 28, color: c.paper }}>
          {earnedThisYear.length === 1 ? 'stamp.' : 'stamps.'}
        </TText>
      </TText>

      {visible.length === 0 ? (
        <TText style={{ fontSize: 13, color: 'rgba(243,237,226,0.5)', paddingHorizontal: 8, marginTop: 14, fontStyle: 'italic' }}>
          No stamps earned this year yet — they collect themselves as you run.
        </TText>
      ) : (
        <View style={{ marginTop: 32, flexDirection: 'row', flexWrap: 'wrap' }}>
          {visible.map((s, i) => (
            <StampSlot
              key={s.id}
              stamp={s}
              index={i}
              active={active}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>
      )}

      {overflow > 0 ? (
        <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.55)', paddingHorizontal: 8, marginTop: 20 }}>
          + {overflow} more in the catalogue.
        </TText>
      ) : null}
    </View>
  );
}

function StampSlot({
  stamp,
  index,
  active,
  reduceMotion,
}: {
  stamp: CatalogStamp;
  index: number;
  active: boolean;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  const rotate = useSharedValue(reduceMotion ? 0 : 12);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      scale.value = 1;
      rotate.value = 0;
      opacity.value = 1;
      return;
    }
    scale.value = 0.6;
    rotate.value = 12;
    opacity.value = 0;
    const delay = index * 70;
    scale.value = withDelay(delay, withTiming(1, { duration: 380, easing: PAGE_EASE }));
    rotate.value = withDelay(delay, withTiming(0, { duration: 380, easing: PAGE_EASE }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }));
  }, [active, reduceMotion, index]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: '25%', alignItems: 'center', marginBottom: 14 }, animatedStyle]}>
      <StampBadge
        id={stamp.id}
        name={stamp.name}
        tier={stamp.tier}
        earned
        size={68}
      />
    </Animated.View>
  );
}

// ── Top Run ──────────────────────────────────────────────────────────────

function TopRunPanel({ active, reduceMotion, stats, topRun, units }: PanelProps) {
  const c = useColors();
  const [mapKey, setMapKey] = useState(0);
  const { route: topRoute, rawLatLng: topRawLatLng } = useActivityStreams(topRun?.id ?? null);
  // Bump RouteMap's key when this page becomes active so the ink-trace
  // animation re-plays. Cheaper than threading a "trigger" prop through.
  useEffect(() => {
    if (active) setMapKey((k) => k + 1);
  }, [active]);

  const titleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const cardOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const cardTranslate = useSharedValue(reduceMotion ? 0 : 24);
  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      titleOpacity.value = 1;
      cardOpacity.value = 1;
      cardTranslate.value = 0;
      return;
    }
    titleOpacity.value = 0;
    cardOpacity.value = 0;
    cardTranslate.value = 24;
    titleOpacity.value = withTiming(1, { duration: 500, easing: PAGE_EASE });
    cardOpacity.value = withDelay(180, withTiming(1, { duration: 500, easing: PAGE_EASE }));
    cardTranslate.value = withDelay(180, withTiming(0, { duration: 600, easing: PAGE_EASE }));
  }, [active, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  if (!topRun) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center' }}>
        <Eyebrow style={{ color: 'rgba(243,237,226,0.55)' }}>BIGGEST DAY</Eyebrow>
        <TText style={{ fontSize: 14, color: 'rgba(243,237,226,0.55)', marginTop: 12, fontStyle: 'italic' }}>
          No runs to highlight yet.
        </TText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>
      <Animated.View style={titleStyle}>
        <Eyebrow style={{ color: 'rgba(243,237,226,0.55)' }}>BIGGEST DAY</Eyebrow>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, color: c.paper, marginTop: 8 }}>
          One run that{' '}
          <TText variant="serifItalic" style={{ fontSize: 28, color: c.paper }}>stood out.</TText>
        </TText>
      </Animated.View>

      <Animated.View style={[{ marginTop: 26, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(243,237,226,0.04)', borderWidth: 1, borderColor: 'rgba(243,237,226,0.10)' }, cardStyle]}>
        <View style={{ backgroundColor: c.ink }}>
          <RouteMap
            key={mapKey}
            points={topRoute ?? undefined}
            rawLatLng={topRawLatLng}
            width={Dimensions.get('window').width - 56}
            height={180}
            style="dark"
            accent={c.accent}
            routeStrokeWidth={2.4}
            flat
          />
        </View>
        <View style={{ padding: 18, gap: 4 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', fontSize: 10 }}>
            {topRun.city ? topRun.city.toUpperCase() : 'RUN'} · {formatLongDate(topRun.date)}
          </Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
            <TText variant="monoMedium" style={{ fontSize: 48, lineHeight: 52, letterSpacing: -1.4, color: c.paper }}>
              {fmtDist(stats.longestRunKm, units)}
            </TText>
            <TText style={{ fontSize: 14, color: 'rgba(243,237,226,0.55)', marginLeft: 6 }}>{distUnit(units)}</TText>
          </View>
          {topRun.title ? (
            <TText variant="serifItalic" style={{ fontSize: 16, color: 'rgba(243,237,226,0.75)', marginTop: 4 }}>
              {topRun.title}
            </TText>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

// ── Sealed (closing) ─────────────────────────────────────────────────────

function SealedPanel({ active, reduceMotion, year }: PanelProps) {
  const c = useColors();
  const sealScale = useSharedValue(reduceMotion ? 1 : 0.5);
  const sealRotate = useSharedValue(reduceMotion ? -2 : -22);
  const sealOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const titleOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      sealScale.value = 1;
      sealRotate.value = -2;
      sealOpacity.value = 1;
      titleOpacity.value = 1;
      return;
    }
    sealScale.value = 0.5;
    sealRotate.value = -22;
    sealOpacity.value = 0;
    titleOpacity.value = 0;
    // Seal lands first — "wax pressed onto paper."
    sealScale.value = withTiming(1, { duration: 520, easing: PAGE_EASE });
    sealRotate.value = withTiming(-2, { duration: 520, easing: PAGE_EASE });
    sealOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    // Title fades in just after the seal settles.
    titleOpacity.value = withDelay(360, withTiming(1, { duration: 500, easing: PAGE_EASE }));
  }, [active, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [{ scale: sealScale.value }, { rotate: `${sealRotate.value}deg` }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: 12 * (1 - titleOpacity.value) }],
  }));

  return (
    <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={sealStyle}>
        <WaxSeal year={year} accent={c.accent} ink={c.paper} />
      </Animated.View>
      <Animated.View style={[{ marginTop: 32, alignItems: 'center' }, titleStyle]}>
        <TText variant="serifItalic" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -1, color: c.paper }}>
          Sealed.
        </TText>
        <TText style={{ fontSize: 13, color: 'rgba(243,237,226,0.6)', marginTop: 10, textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>
          Your {year} album, kept in the drawer. See you on the roads.
        </TText>
      </Animated.View>
    </View>
  );
}

function WaxSeal({ year, accent, ink }: { year: number; accent: string; ink: string }) {
  const size = 200;
  const r = size / 2;
  // Lightly scalloped edge — 18 short ticks around the rim to suggest the
  // pressed-wax serration without going full sun.
  const ticks = Array.from({ length: 18 }).map((_, i) => {
    const angle = (i * Math.PI * 2) / 18;
    const inner = r - 3;
    const outer = r + 4;
    return {
      x1: r + Math.cos(angle) * inner,
      y1: r + Math.sin(angle) * inner,
      x2: r + Math.cos(angle) * outer,
      y2: r + Math.sin(angle) * outer,
    };
  });
  return (
    <Svg width={size + 16} height={size + 16} viewBox={`-8 -8 ${size + 16} ${size + 16}`}>
      <G>
        {ticks.map((t, i) => (
          <Line key={i} {...t} stroke={accent} strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
        ))}
        <Circle cx={r} cy={r} r={r - 4} fill={accent} />
        <Circle cx={r} cy={r} r={r - 14} fill="none" stroke={ink} strokeOpacity={0.55} strokeWidth={1.2} />
        <Path
          d={`M ${r - (r - 24)} ${r} A ${r - 24} ${r - 24} 0 1 1 ${r + (r - 24)} ${r}`}
          fill="none"
          id="seal-arc"
        />
        <SvgText
          fill={ink}
          fontSize={10}
          letterSpacing={2.4}
          fontWeight="700"
          x={r}
          y={r - 28}
          textAnchor="middle"
          opacity={0.85}
        >
          RUNSTAMP
        </SvgText>
        <SvgText
          fill={ink}
          fontSize={56}
          fontWeight="700"
          x={r}
          y={r + 18}
          textAnchor="middle"
          fontFamily="JetBrainsMono-Bold"
        >
          {String(year).slice(-2)}
        </SvgText>
      </G>
    </Svg>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────

interface YearStats {
  totalKm: number;
  totalRuns: number;
  totalSec: number;
  newCities: number;
  countries: number;
  continents: number;
  longestRunKm: number;
  longestRunDate: string | null;
}

function computeYearStats(activities: Activity[], earned: CatalogStamp[], year: number): YearStats {
  const yearPrefix = `${year}-`;
  const yearRuns = activities.filter((a) => a.date.startsWith(yearPrefix));
  let totalKm = 0;
  let totalSec = 0;
  let longestRunKm = 0;
  let longestRunDate: string | null = null;
  const cities = new Set<string>();
  const countries = new Set<string>();
  for (const r of yearRuns) {
    totalKm += r.distance;
    totalSec += r.seconds;
    if (r.distance > longestRunKm) {
      longestRunKm = r.distance;
      longestRunDate = r.date;
    }
    if (r.city?.trim()) cities.add(r.city.trim());
    if (r.country?.trim()) countries.add(r.country.trim());
  }
  return {
    totalKm,
    totalRuns: yearRuns.length,
    totalSec,
    newCities: cities.size,
    countries: countries.size,
    continents: countContinents([...countries]),
    longestRunKm,
    longestRunDate,
  };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
