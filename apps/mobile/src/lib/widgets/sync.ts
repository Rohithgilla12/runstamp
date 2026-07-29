import { Platform } from 'react-native';

import { WidgetBridge } from 'widget-bridge';

import {
  buildSnapshot,
  snapshotFingerprint,
  type SyncWidgetInput,
} from './build';
import { WIDGET_APP_GROUP, WIDGET_SNAPSHOT_KEY } from './types';

export type { SyncWidgetInput } from './build';
export {
  buildSnapshot,
  buildWeekDots,
  startOfWeek,
  weekDistanceWithUnit,
} from './build';

let lastFingerprint: string | null = null;

export function syncWidgetData(input: SyncWidgetInput): void {
  if (Platform.OS !== 'ios') return;
  const snapshot = buildSnapshot(input);
  const fingerprint = snapshotFingerprint(snapshot);
  if (fingerprint === lastFingerprint) return;
  try {
    WidgetBridge.setSnapshot(
      WIDGET_APP_GROUP,
      WIDGET_SNAPSHOT_KEY,
      JSON.stringify(snapshot),
    );
    lastFingerprint = fingerprint;
  } catch (error) {
    console.error('Failed to sync widget data:', error);
  }
}

export function clearWidgetData(): void {
  if (Platform.OS !== 'ios') return;
  lastFingerprint = null;
  WidgetBridge.clearSnapshot(WIDGET_APP_GROUP, WIDGET_SNAPSHOT_KEY);
}

/** Test helper — resets the fingerprint cache between cases. */
export function _resetWidgetSyncFingerprint(): void {
  lastFingerprint = null;
}
