import { useEffect } from 'react';

import { useAppState } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import { useActivities } from '../../state/useActivities';
import { useStamps } from '../../state/useStamps';
import { clearWidgetData, syncWidgetData } from './sync';

// Mirrors activities + stamps + units into the App Group snapshot that the
// Home Screen widgets and Lock Screen / Apple Watch Smart Stack accessories
// render. Mount once under ActivitiesProvider (see App.tsx).
export function WidgetDataSync(): null {
  const { status } = useAuth();
  const { units } = useAppState();
  const { activities } = useActivities();
  const { earned } = useStamps();

  useEffect(() => {
    if (status !== 'signed-in') {
      clearWidgetData();
      return;
    }
    const last = [...earned].sort((a, b) =>
      (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''),
    )[0];
    syncWidgetData({
      activities,
      stampCount: earned.length,
      lastStampName: last?.name ?? null,
      units,
    });
  }, [status, activities, earned, units]);

  return null;
}
