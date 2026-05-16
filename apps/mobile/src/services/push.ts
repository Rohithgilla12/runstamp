import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiPost } from './api';

// Why Expo Push (not @react-native-firebase/messaging): the mobile build
// uses `useFrameworks: 'static'` for Firebase pods, and RNFB messaging's
// native module is incompatible with that build chain (same conflict that
// cadence-mobile hit and resolved by switching to Expo Push).
// expo-notifications issues an ExponentPushToken[…] which the Expo Push
// Service fans out to APNs + FCM behind the scenes.

// Foreground behavior — when a push lands while Runstamp is open we still
// show the banner. Calm by default: no badge, no sound (we let the OS
// quiet-hours / focus-mode call those).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushRegisterResult {
  granted: boolean;
  token: string | null;
}

// requestAndRegister asks for notification permission, fetches the Expo
// push token, and posts it to the backend. Safe to call on every signed-in
// launch — the OS only shows the prompt the first time, the server upserts
// by (user_id, token) so re-registers are idempotent.
//
// Never throws — a transient failure shouldn't block the sign-in flow.
export async function requestAndRegister(idToken: string | null): Promise<PushRegisterResult> {
  if (!Device.isDevice) {
    // Simulator / web — no push tokens issued.
    return { granted: false, token: null };
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('stamps', {
        name: 'Stamp earned',
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch {
      // Best-effort.
    }
  }

  let granted = false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (existing.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    granted = finalStatus === 'granted';
  } catch {
    return { granted: false, token: null };
  }
  if (!granted) return { granted: false, token: null };

  // getExpoPushTokenAsync wants the EAS projectId in newer SDKs.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  let token: string | null = null;
  try {
    const result = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    token = result.data;
  } catch {
    return { granted: true, token: null };
  }
  if (!token) return { granted: true, token: null };

  try {
    await apiPost('/v1/me/device-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    }, { idToken });
  } catch {
    // Server-side register failed — keep going. Re-try happens next launch.
  }

  return { granted: true, token };
}
