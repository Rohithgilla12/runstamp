import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useColors } from '../theme';
import { Icon } from '../Icon';

interface UseChartShareResult {
  captureRef: React.RefObject<View | null>;
  share: () => Promise<void>;
  busy: boolean;
}

// Captures any chart view as a PNG, saves to camera roll (best-effort),
// and opens the OS share sheet. The view passed via `captureRef` is what
// gets rendered into the image — any share button you put outside that
// ref stays out of the shared file.
export function useChartShare(title: string, shareMessage?: string): UseChartShareResult {
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const share = useCallback(async () => {
    if (busy || !ref.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (perm.granted) {
          await MediaLibrary.createAssetAsync(uri);
        }
      } catch {
        // ignore; we still try the share sheet
      }
      await Share.share({
        url: uri,
        message: shareMessage ?? `My ${title.toLowerCase()} via Runstamp`,
      });
    } catch (e) {
      Alert.alert('Couldn’t share', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [busy, shareMessage, title]);

  return { captureRef: ref, share, busy };
}

interface ChartShareButtonProps {
  onPress: () => void;
  busy: boolean;
}

// The small ink-coloured icon button that sits in the top-right of a
// chart card. Positioned absolutely so the parent renders it OUTSIDE the
// captured view ref.
export function ChartShareButton({ onPress, busy }: ChartShareButtonProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={10}
      accessibilityLabel="Share chart"
      style={({ pressed }) => ({
        position: 'absolute', top: 14, right: 14,
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.ink,
        opacity: pressed || busy ? 0.6 : 0.85,
      })}
    >
      <Icon.share size={14} color={c.paper} />
    </Pressable>
  );
}
