import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../nav/types';

// Handles iOS / Android push notification taps for the stamp_earned kind.
// Two entry points to cover both states:
//   - getInitialNotification: the app was opened from a *killed* state by
//     tapping a notification. Runs once on mount.
//   - onNotificationOpenedApp: the app was in the background and brought
//     forward by tapping. Returns an unsubscribe.
//
// Both navigate to Stamps with openStampId set — StampsScreen reads that
// param and opens the share modal for the matching stamp.
export function useStampNotificationTap() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    let mounted = true;
    let unsubscribe: undefined | (() => void);
    (async () => {
      try {
        const m = await import('@react-native-firebase/messaging');
        const messaging = m.default;

        const initial = await messaging().getInitialNotification();
        if (mounted && initial?.data?.kind === 'stamp_earned' && typeof initial.data.stampId === 'string') {
          nav.navigate('Stamps', { openStampId: initial.data.stampId });
        }

        unsubscribe = messaging().onNotificationOpenedApp((msg) => {
          if (msg?.data?.kind === 'stamp_earned' && typeof msg.data.stampId === 'string') {
            nav.navigate('Stamps', { openStampId: msg.data.stampId });
          }
        });
      } catch {
        // Notification module not available (web, dev without rebuild). Silent ignore.
      }
    })();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [nav]);
}
