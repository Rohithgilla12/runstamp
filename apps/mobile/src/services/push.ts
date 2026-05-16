import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { apiPost } from './api';

// Register the device for FCM, ask for permission once, exchange the
// resulting token with the backend. Idempotent — POST device-token
// upserts on (user_id, token).

export interface RegisterResult {
  granted: boolean;
  token?: string;
}

export async function registerDeviceForPush(idToken: string | null): Promise<RegisterResult> {
  try {
    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!granted) return { granted: false };

    // iOS needs an explicit APNs token registration call; RNFB handles it
    // transparently if push capability + APNs cert are in place (which they
    // are — see app.config.ts UIBackgroundModes + entitlements).
    const token = await messaging().getToken();
    if (!token) return { granted: true };

    await apiPost('/v1/me/device-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    }, { idToken });

    return { granted: true, token };
  } catch (e) {
    // Push setup failing should never block the rest of the app. The user
    // simply won't receive stamp notifications until next launch.
    return { granted: false };
  }
}

/**
 * Listen for token refreshes — FCM rotates tokens for many reasons
 * (app reinstall, restore-from-backup, app data cleared, etc). Hook
 * into AuthContext so a fresh token immediately reaches the backend.
 */
export function onTokenRefresh(idToken: string | null, callback?: (token: string) => void) {
  return messaging().onTokenRefresh(async (token) => {
    callback?.(token);
    try {
      await apiPost('/v1/me/device-token', {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      }, { idToken });
    } catch {
      // Best-effort — next cold start will re-register.
    }
  });
}
