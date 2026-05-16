import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useColors } from './theme';
import { Eyebrow, TText } from './typography';
import { Card } from './atoms';
import { Icon } from './Icon';
import { RunstampMark } from './RunstampMark';

interface Props {
  /** Headline at the top of the captured card. */
  title: string;
  /**
   * Sub-line under the title. Typically a date range or stat callout —
   * "2026 · 47 cities" or "May 2026 · 188 km". Optional.
   */
  subtitle?: string;
  /** The chart itself. Rendered inside the capture area. */
  children: React.ReactNode;
  /** Optional message used by the OS share sheet caption. */
  shareMessage?: string;
}

// Wraps any analytics chart in a card that can be captured + shared as a
// standalone artifact. Tap the share icon → capture the framed view → save
// to camera roll → open the OS share sheet.
//
// The card includes a title row at the top, a "via Runstamp" mark at the
// bottom, and the chart in between — so when a user posts a heatmap to
// Stories it reads as its own thing, not a screenshot of a stats screen.
export function ShareableChartCard({ title, subtitle, children, shareMessage }: Props) {
  const c = useColors();
  const captureViewRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const onShare = useCallback(async () => {
    if (busy || !captureViewRef.current) return;
    setBusy(true);
    try {
      // 2x retina output. PNG so the paper card renders crisp; JPEG quality
      // wouldn't matter for the flat colour palette anyway.
      const uri = await captureRef(captureViewRef, { format: 'png', quality: 1, result: 'tmpfile' });

      // Best-effort save to camera roll. If the user hasn't granted Photos
      // access we still try the share sheet — the temp URI works for
      // Instagram / WhatsApp / X without saving.
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (perm.granted) {
          await MediaLibrary.createAssetAsync(uri);
        }
      } catch {
        // ignore — we still open the share sheet below
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

  return (
    <View>
      <View ref={captureViewRef} collapsable={false} style={{ backgroundColor: c.paper }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>{title.toUpperCase()}</Eyebrow>
              {subtitle && (
                <TText variant="mono" style={{ fontSize: 11, color: c.ink2, marginTop: 3, letterSpacing: -0.1 }}>
                  {subtitle}
                </TText>
              )}
            </View>
            {/* Share button — the only thing not inside the capture area
                 would be ideal, but capture from the outer ref includes
                 itself. We hide visually by making it transparent inside
                 the capture; we paint it again outside via the absolute
                 overlay below. Simpler: keep it inside; the share icon
                 in a captured image is fine signal "this is shareable",
                 actually we DON'T want it in the image. Solution: render
                 the button OUTSIDE the captureViewRef. */}
          </View>

          {children}

          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RunstampMark tone="ink" opacity={0.5} />
            <TText variant="mono" style={{ fontSize: 8, color: c.ink3, letterSpacing: 1.2 }}>
              {new Date().getFullYear()}
            </TText>
          </View>
        </Card>
      </View>

      {/* Share button — positioned absolutely OUTSIDE the captureViewRef so
          the icon never gets baked into the shared image. */}
      <Pressable
        onPress={onShare}
        disabled={busy}
        hitSlop={10}
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
    </View>
  );
}
