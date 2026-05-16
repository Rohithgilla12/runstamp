import React, { useCallback, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useColors } from '../design/theme';
import { TText, Eyebrow } from '../design/typography';
import { Button } from '../design/atoms';
import { Icon } from '../design/Icon';
import { PlacesShareCard } from '../design/PlacesShareCard';
import { type MapCity } from '../design/WorldMap';

interface Props {
  visible: boolean;
  cities: MapCity[];
  stats: { cities: number; countries: number; continents: number; totalKm: number };
  onClose: () => void;
}

// Bottom-sheet modal that previews the "My YYYY Runstamps" share artifact
// and offers "Save to camera roll" + "Share…". Captures the PlacesShareCard
// via captureRef — mirrors the StampShareModal pattern.
export function PlacesShareModal({ visible, cities, stats, onClose }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const captureViewRef = useRef<View>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);

  const year = new Date().getFullYear();
  const screenW = Dimensions.get('window').width;
  const cardW = Math.min(screenW - 40, 320);
  const cardH = Math.round((cardW * 16) / 9);

  const runCapture = useCallback(async (mode: 'save' | 'share') => {
    if (busy || !captureViewRef.current) return;
    setBusy(mode);
    try {
      const uri = await captureRef(captureViewRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (mode === 'save') {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (!perm.granted) {
          Alert.alert('Photos access needed', 'Grant Runstamp access to Photos to save this card.');
          return;
        }
        await MediaLibrary.createAssetAsync(uri);
        Alert.alert('Saved to camera roll', `My ${year} Runstamps is in your Photos.`);
      } else {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(true);
          if (perm.granted) await MediaLibrary.createAssetAsync(uri);
        } catch {
          // ignore — share sheet still works with temp uri
        }
        await Share.share({
          url: uri,
          message: `${stats.cities} stamps · ${stats.countries} countries · ${stats.continents} continents — my ${year} on Runstamp`,
        });
      }
    } catch (e) {
      Alert.alert('Couldn’t share', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [busy, stats, year]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.7)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: c.paper,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 14, paddingBottom: Math.max(insets.bottom, 18), paddingHorizontal: 20,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.line }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>SHARE · {year} PASSPORT</Eyebrow>
              <TText variant="serif" style={{ fontSize: 22, color: c.ink, marginTop: 2, lineHeight: 26, letterSpacing: -0.3 }}>
                Every city, everywhere.
              </TText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
              <Icon.x size={18} color={c.ink2} />
            </Pressable>
          </View>

          <View style={{ alignItems: 'center' }}>
            <View ref={captureViewRef} collapsable={false} style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: c.paper }}>
              <PlacesShareCard cities={cities} year={year} stats={stats} width={cardW} height={cardH} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" full onPress={() => runCapture('save')} icon={busy === 'save' ? undefined : <Icon.download size={16} color={c.ink} />}>
                {busy === 'save' ? 'Saving…' : 'Save'}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button kind="accent" full onPress={() => runCapture('share')} icon={busy === 'share' ? undefined : <Icon.share size={16} color="#fff" />}>
                {busy === 'share' ? 'Sharing…' : 'Share'}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
