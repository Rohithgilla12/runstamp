import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '../../design/theme';
import { TText, Eyebrow } from '../../design/typography';
import { DESTINATIONS, type Destination, type DestinationResult } from './destinations';
import type { Surface } from '../layouts/types';

interface Props {
  visible: boolean;
  tmpUri: string | null;
  surface: Surface;
  fileSizeBytes?: number | null;
  fileName?: string;
  onClose: () => void;
}

const TONE_STYLES: Record<Destination['tone'], { background: string; color: string; border?: string }> = {
  ig:    { background: '#dd2a7b', color: '#ffffff' },
  ink:   { background: '#14110d', color: '#f3ede2' },
  paper: { background: '#ebe3d3', color: '#14110d' },
  plain: { background: '#ffffff', color: '#14110d', border: 'rgba(20,17,13,0.12)' },
};

export function ShareSheet({ visible, tmpUri, surface, fileSizeBytes, fileName, onClose }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<Destination['id'] | null>(null);
  const [last, setLast] = useState<{ id: Destination['id']; result: DestinationResult } | null>(null);

  useEffect(() => {
    if (visible) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [visible]);

  const run = async (d: Destination) => {
    if (!tmpUri || busy) return;
    setBusy(d.id);
    const result = await d.handle(tmpUri);
    setBusy(null);
    setLast({ id: d.id, result });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.7)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: c.paper,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: insets.bottom + 22,
          }}
        >
          <View style={{ width: 36, height: 4, backgroundColor: c.line, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
          <Eyebrow style={{ color: c.accent }}>EXPORT · {surface} · PNG</Eyebrow>
          <TText variant="serifItalic" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.4, color: c.ink, marginTop: 4 }}>Sealed.</TText>
          <TText style={{ fontSize: 12.5, color: c.ink3, marginTop: 4 }}>Captured at retina scale. Pick a destination.</TText>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <View style={{ width: 90, aspectRatio: 9 / 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.paper2 }}>
              {tmpUri && <Image source={{ uri: tmpUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
            </View>
            <View style={{ flex: 1 }}>
              <TText variant="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: c.ink3 }}>FILE</TText>
              <TText variant="mono" style={{ fontSize: 11, color: c.ink, marginTop: 2 }}>{fileName ?? 'runstamp.png'}</TText>
              {fileSizeBytes != null && (
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, backgroundColor: c.paper2, borderRadius: 5, marginTop: 8 }}>
                  <TText variant="mono" style={{ fontSize: 9, color: c.ink2 }}>★ {(fileSizeBytes / 1024 / 1024).toFixed(2)} MB</TText>
                </View>
              )}
            </View>
          </View>

          <Eyebrow style={{ color: c.ink3, marginTop: 18, paddingBottom: 6, borderBottomWidth: 1, borderColor: c.line }}>SEND TO</Eyebrow>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {DESTINATIONS.map((d) => {
              const tone = TONE_STYLES[d.tone];
              const isBusy = busy === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => run(d)}
                  disabled={isBusy || !tmpUri}
                  style={({ pressed }) => [{
                    flex: 1, alignItems: 'center', paddingVertical: 12,
                    borderRadius: 12, gap: 6,
                    backgroundColor: tone.background,
                    borderWidth: tone.border ? 1 : 0,
                    borderColor: tone.border,
                    opacity: !tmpUri ? 0.4 : pressed ? 0.85 : 1,
                  }]}
                >
                  <TText style={{ fontSize: 18, color: tone.color }}>
                    {d.id === 'stories' ? '▶' : d.id === 'feed' ? '⊞' : d.id === 'photos' ? '↓' : '⋯'}
                  </TText>
                  <TText style={{ fontSize: 11, color: tone.color, fontWeight: '500' }}>{d.label}</TText>
                  <TText variant="mono" style={{ fontSize: 8, color: tone.color, opacity: 0.7, letterSpacing: 0.6 }}>{isBusy ? 'WORKING…' : d.hint}</TText>
                </Pressable>
              );
            })}
          </View>

          {last && (
            <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 14, textAlign: 'center' }}>
              {last.result.status === 'ok'                  ? `Sent to ${last.id}.`
              : last.result.status === 'permission-denied'  ? 'Photo permission denied. Enable in Settings → Runstamp.'
              : last.result.status === 'no-instagram'       ? 'Instagram not installed. Opened the store.'
              : `Error: ${last.result.message ?? 'unknown'}`}
            </TText>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
