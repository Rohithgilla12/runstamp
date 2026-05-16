import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../nav/types';

// Routes push notification taps to the matching Stamps share modal.
//
// Two entry points to cover both launch states:
//   - getLastNotificationResponseAsync: the tap that launched the app from
//     cold (Expo's listener doesn't fire for that case — we have to ask).
//   - addNotificationResponseReceivedListener: every tap while warm or
//     backgrounded.
//
// Server sets data.kind = 'stamp_earned' + data.stampId in
// internal/push.SendStampEarned. We read those and navigate to Stamps
// with openStampId — StampsScreen opens the share modal on mount.
export function useStampNotificationTap() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await Notifications.getLastNotificationResponseAsync();
        if (cancelled) return;
        routeFromResponse(initial, nav);
      } catch {
        // ignore — module may not be available (web, dev without rebuild)
      }
    })();

    let sub: ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null = null;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        routeFromResponse(response, nav);
      });
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [nav]);
}

function routeFromResponse(
  response: Notifications.NotificationResponse | null | undefined,
  nav: NativeStackNavigationProp<RootStackParamList>,
) {
  const data = response?.notification?.request?.content?.data;
  if (!data || typeof data !== 'object') return;
  const kind = (data as { kind?: unknown }).kind;
  const stampId = (data as { stampId?: unknown }).stampId;
  if (kind !== 'stamp_earned' || typeof stampId !== 'string') return;
  nav.navigate('Stamps', { openStampId: stampId });
}
