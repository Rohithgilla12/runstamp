import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Dimensions, Modal, Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { CatalogStamp } from '../state/useStamps';
import { useActivities } from '../state/useActivities';
import { useColors } from '../design/theme';
import { TText, Eyebrow } from '../design/typography';
import { Button } from '../design/atoms';
import { Icon } from '../design/Icon';
import { StampShareCard } from '../design/StampShareCard';

// "Stamp earned" punch — the brand keystone moment. Card scales down from
// 1.35 with a slight initial rotation, settles at a small final tilt so it
// looks stamped onto paper rather than CAD-aligned. Final state is reached
// in ~350ms with an ease-out-quint, well before any user can tap Save/Share —
// so view-shot captures the resting (slightly-tilted) frame.
//
// A short ink-bloom ring fades behind the card at the moment of landing so
// the press registers visually even when the card is small on screen.
const PUNCH_DURATION = 350;
const PUNCH_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const FINAL_TILT_DEG = -1.5;

const COUNTRY_ISO: Record<string, string> = {
  India: 'IN',
  'United States': 'US',
  'United Kingdom': 'GB',
  Germany: 'DE',
  France: 'FR',
  Japan: 'JP',
  Australia: 'AU',
  Canada: 'CA',
  China: 'CN',
  Brazil: 'BR',
  Spain: 'ES',
  Italy: 'IT',
  Singapore: 'SG',
  Thailand: 'TH',
  Netherlands: 'NL',
  Switzerland: 'CH',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Ireland: 'IE',
  Mexico: 'MX',
  'South Africa': 'ZA',
  Kenya: 'KE',
  Ethiopia: 'ET',
  'New Zealand': 'NZ',
  Portugal: 'PT',
  Poland: 'PL',
  Belgium: 'BE',
  Austria: 'AT',
};

function isoFor(country?: string): string | undefined {
  if (!country) return undefined;
  return COUNTRY_ISO[country] ?? country.slice(0, 2).toUpperCase();
}

interface Props {
  stamp: CatalogStamp | null;
  onClose: () => void;
}

// Bottom-sheet modal that previews a stamp's share card and offers
// "Save to camera roll" + "Share…" actions. Captures the StampShareCard
// at 2x via captureRef.
export function StampShareModal({ stamp, onClose }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { activities } = useActivities();
  const captureViewRef = useRef<View>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);

  // If the stamp is linked to a specific activity (via context.activityId
  // server-side), surface that run's city + km + title for the share card.
  const linked = useMemo(() => {
    if (!stamp?.activityId) return null;
    return activities.find((a) => a.id === stamp.activityId) ?? null;
  }, [stamp, activities]);

  const screenW = Dimensions.get('window').width;
  const cardW = Math.min(screenW - 40, 320);
  const cardH = Math.round((cardW * 16) / 9);

  // Punch animation. Keyed on stamp.id so opening a different stamp from the
  // catalog re-fires the entrance — not just first mount.
  const scale = useSharedValue(1);
  const rotate = useSharedValue(FINAL_TILT_DEG);
  const opacity = useSharedValue(1);
  const bloomScale = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      setReduceMotion(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!stamp) return;
    if (reduceMotion) {
      scale.value = 1;
      rotate.value = FINAL_TILT_DEG;
      opacity.value = 1;
      bloomScale.value = 1;
      bloomOpacity.value = 0;
      return;
    }
    // Reset to start state. Slight overshoot in rotation + scale so it
    // reads as "thumb pressed harder on one side."
    scale.value = 1.35;
    rotate.value = 7;
    opacity.value = 0;
    bloomScale.value = 0;
    bloomOpacity.value = 0.55;

    scale.value = withTiming(1, { duration: PUNCH_DURATION, easing: PUNCH_EASING });
    rotate.value = withTiming(FINAL_TILT_DEG, { duration: PUNCH_DURATION, easing: PUNCH_EASING });
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    // Bloom: expands past 1 and fades — looks like ink soaking into paper
    // at the moment the stamp lands.
    bloomScale.value = withTiming(1.15, { duration: PUNCH_DURATION, easing: PUNCH_EASING });
    bloomOpacity.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) });
  }, [stamp?.id, reduceMotion, scale, rotate, opacity, bloomScale, bloomOpacity]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));
  const bloomAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bloomScale.value }],
    opacity: bloomOpacity.value,
  }));

  const runCapture = useCallback(async (mode: 'save' | 'share') => {
    if (!stamp || busy || !captureViewRef.current) return;
    setBusy(mode);
    try {
      const uri = await captureRef(captureViewRef, { format: 'png', quality: 1, result: 'tmpfile' });

      let savedAssetUri: string | undefined;
      let permissionDenied = false;
      if (mode === 'save') {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (!perm.granted) {
          permissionDenied = true;
        } else {
          const asset = await MediaLibrary.createAssetAsync(uri);
          savedAssetUri = asset.uri;
        }
      }

      if (mode === 'share') {
        // Best-effort save in the background so users have the asset for
        // re-share later, but never block the sheet on Photos permission.
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(true);
          if (perm.granted) await MediaLibrary.createAssetAsync(uri);
        } catch {
          // ignore — share sheet still works with the temp uri
        }
        await Share.share({
          url: uri,
          message: `Earned "${stamp.name}" — stamp ${stamp.tier} via Runstamp`,
        });
      } else if (savedAssetUri) {
        Alert.alert('Saved to camera roll', `${stamp.name} stamp is in your Photos.`);
      } else if (permissionDenied) {
        Alert.alert('Photos access needed', 'Grant Runstamp access to Photos to save this stamp.');
      }
    } catch (e) {
      Alert.alert('Couldn’t share stamp', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [busy, stamp]);

  if (!stamp) return null;

  return (
    <Modal
      visible={!!stamp}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.7)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: c.paper,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 18),
            paddingHorizontal: 20,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.line }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>EARNED · {stamp.tier.toUpperCase()}</Eyebrow>
              <TText variant="serif" style={{ fontSize: 22, color: c.ink, marginTop: 2, lineHeight: 26, letterSpacing: -0.3 }} numberOfLines={2}>
                {stamp.name}
              </TText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
              <Icon.x size={18} color={c.ink2} />
            </Pressable>
          </View>

          {/* Capture area — the share-card image. Wrapped in an
              Animated.View that runs the "stamp earned" punch on entry. The
              capture ref stays on the inner static view so view-shot grabs
              the resting frame regardless of any in-flight transform. */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: cardW, height: cardH, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    width: cardW * 1.15,
                    height: cardW * 1.15,
                    borderRadius: cardW,
                    backgroundColor: c.ink,
                  },
                  bloomAnimatedStyle,
                ]}
              />
              <Animated.View style={cardAnimatedStyle}>
                <View ref={captureViewRef} collapsable={false} style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: c.paper }}>
                  <StampShareCard
                    stamp={stamp}
                    activityCity={linked?.city}
                    activityDistanceKm={linked?.distance}
                    activityTitle={linked?.title}
                    countryISO={isoFor(linked?.country)}
                    width={cardW}
                    height={cardH}
                  />
                </View>
              </Animated.View>
            </View>
          </View>

          {stamp.description && (
            <TText style={{ fontSize: 12, color: c.ink3, marginTop: 12, textAlign: 'center', lineHeight: 16 }}>
              {stamp.description}
            </TText>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Button
                kind="ghost"
                full
                onPress={() => runCapture('save')}
                icon={busy === 'save' ? undefined : <Icon.download size={16} color={c.ink} />}
              >
                {busy === 'save' ? 'Saving…' : 'Save'}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                kind="accent"
                full
                onPress={() => runCapture('share')}
                icon={busy === 'share' ? undefined : <Icon.share size={16} color="#fff" />}
              >
                {busy === 'share' ? 'Sharing…' : 'Share'}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
