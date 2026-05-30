import React from 'react';
import { View } from 'react-native';
import type { Activity } from '../../data/models';
import { useAppState } from '../../state/AppState';
import { useStamps } from '../../state/useStamps';
import { Perforation } from './perforation';
import { PostRunCard } from './post-run-card';
import { RecapLine } from './recap-line';
import { RecentlyEarned } from './recently-earned';
import { RecentRuns } from './recent-runs';
import { WeekLedger } from './week-ledger';
import { computeWeekStats } from './week-stats';

export function ConnectedHome({
  activities,
  latest,
  onOpenActivity,
  onOpenEditor,
  onOpenStamps,
  onOpenAllActivities,
}: {
  activities: Activity[];
  latest: Activity;
  onOpenActivity: (id: string) => void;
  onOpenEditor: (id: string) => void;
  onOpenStamps: () => void;
  onOpenAllActivities: () => void;
}) {
  const { units } = useAppState();
  const weekStats = computeWeekStats(activities, units === 'mi');
  const { earned } = useStamps();

  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <PostRunCard
          run={latest}
          onOpen={() => onOpenActivity(latest.id)}
          onShare={() => onOpenEditor(latest.id)}
        />
      </View>

      <Perforation />

      <WeekLedger stats={weekStats} />

      <RecapLine activities={activities} earned={earned} />

      {earned.length > 0 && (
        <>
          <Perforation />
          <RecentlyEarned earned={earned} onOpenStamps={onOpenStamps} />
        </>
      )}

      <Perforation />

      <RecentRuns
        activities={activities}
        onOpenActivity={onOpenActivity}
        onOpenAllActivities={onOpenAllActivities}
      />
    </>
  );
}
