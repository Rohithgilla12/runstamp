// HomeScreen — redesigned per .impeccable.md.
//
// Home is an ARTIFACT surface: a keepsake page of a personal log book. The
// latest run is the hero, then a quiet line of "this week," a rotating
// recap, recently-earned stamps, and a short tail of recent runs.
// Perforated dividers section the page without shouting at the user with
// section headers.
//
// This file is composition only — every piece lives in screens/home/.

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '../data/models';
import { PostmarkMark } from '../design/SunMark';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { useActivities } from '../state/useActivities';
import { useFullRefresh } from '../state/useFullRefresh';
import { ConnectedHome } from './home/connected-home';
import { EmptyHome } from './home/empty-home';
import { MissingRunsLine } from './home/missing-runs-line';
import { StampCountChip } from './home/stamp-count-chip';
import { StrengthCard } from './home/strength-card';
import { formatTodayEyebrow, greetingForHour } from './home/week-stats';
import { useMissingHealthKitRuns } from './home/use-missing-healthkit-runs';
import type { TabProps } from '../nav/types';

export function HomeScreen({ navigation }: TabProps<'Home'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { activities, loading } = useActivities();
  const fullRefresh = useFullRefresh({ withStamps: true });
  const latest: Activity | undefined = activities[0];
  const greeting = greetingForHour(new Date().getHours());
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fullRefresh(); } finally { setRefreshing(false); }
  }, [fullRefresh]);

  const missingHk = useMissingHealthKitRuns(activities);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
    >
      {/* Page header — date as a postmark + serif italic greeting. */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{formatTodayEyebrow(new Date())}</Eyebrow>
          <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.6, marginTop: 4 }}>{greeting},</TText>
          <TText variant="serifItalic" style={{ fontSize: 28, lineHeight: 32, color: c.ink }}>Runner.</TText>
        </View>
        <View style={{ marginTop: 4 }}>
          <PostmarkMark size={42} color={c.ink2} />
        </View>
      </View>

      <StampCountChip
        activities={activities}
        onPress={() => navigation.navigate('Places')}
      />

      {missingHk > 0 && (
        <MissingRunsLine
          count={missingHk}
          onPress={() => navigation.navigate('HealthRuns')}
        />
      )}

      {latest ? (
        <ConnectedHome
          activities={activities}
          latest={latest}
          onOpenActivity={(id) => navigation.navigate('Activity', { id })}
          onOpenEditor={(id) => navigation.navigate('Editor', { id })}
          onOpenStamps={() => navigation.navigate('Stamps')}
          onOpenAllActivities={() => navigation.navigate('Activities')}
        />
      ) : (
        <EmptyHome loading={loading} onConnect={() => navigation.navigate('Profile')} />
      )}

      <StrengthCard onPress={() => navigation.navigate('Strength')} />
    </ScrollView>
  );
}
