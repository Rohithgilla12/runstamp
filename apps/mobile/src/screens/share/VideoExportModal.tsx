// VideoExportModal
//
// Drives a single chart's video export and dresses the wait as a postal act:
// the card being exported rides in a sorting tray (live preview) while a
// postmark ring cancels frame by frame, then a wax seal presses down before
// the file is handed to the OS share sheet.
//
// Mounts the offscreen renderer, walks the encoder through the reveal frames,
// mirrors each captured frame's progress into an on-screen preview, then hands
// the resulting MP4 URI back to the caller.
//
// Caller pattern — see ShareSheet wiring sites:
//
//   const [exporting, setExporting] = useState(false);
//
//   <VideoExportModal
//     visible={exporting}
//     dims={{ width: 1080, height: 1350 }}
//     renderFrame={(p) => <PeriodShareCard summary={summary} progress={p} />}
//     onCancel={() => setExporting(false)}
//     onComplete={async (uri) => {
//       setExporting(false);
//       await Share.share({ url: uri });
//     }}
//   />

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Modal, Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '../../design/theme';
import { Icon } from '../../design/Icon';
import { Eyebrow, TText } from '../../design/typography';
import {
  encodeChartVideo,
  VideoExportRenderer,
  type VideoExportRendererHandle,
} from '../../services/videoExport';

type Phase = 'preparing' | 'capturing' | 'muxing' | 'done';

// Hold beat after encoding finishes — long enough for the wax seal to press
// in and register as "done" before the modal fades and the share sheet takes
// over. Without it the modal vanished mid-progress and the handoff flashed.
const DONE_HOLD_MS = 720;

interface Props {
  visible: boolean;
  /** Off-screen render dimensions. The MP4 is encoded at these dims. */
  dims: { width: number; height: number };
  fps?: number;
  durationSec?: number;
  /** Renders the share card at the given progress for each frame. */
  renderFrame: (progress: number) => ReactNode;
  /** Fires on user cancel OR encode failure. The caller should hide the modal. */
  onCancel: () => void;
  /** Fires with the final MP4 file:// URI when encoding completes. */
  onComplete: (uri: string) => void;
}

export function VideoExportModal({
  visible,
  dims,
  fps = 30,
  durationSec = 3,
  renderFrame,
  onCancel,
  onComplete,
}: Props) {
  const c = useColors();
  const rendererRef = useRef<VideoExportRendererHandle | null>(null);
  const cancelledRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('preparing');
  const [framesDone, setFramesDone] = useState(0);
  const totalFrames = Math.max(1, Math.round(fps * durationSec));

  // Wax-seal press-in. Starts oversized + transparent; settles to 1×/opaque
  // on the 'done' phase. ease-out, no bounce (per the motion bar).
  const sealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      cancelledRef.current = false;
      setPhase('preparing');
      setFramesDone(0);
      sealAnim.setValue(0);
      return;
    }

    // Run kicks off after the renderer is mounted and the first frame is
    // ready to paint. requestAnimationFrame defers to the next paint;
    // a second rAF is conservative cover for the offscreen tree's first
    // layout pass on slower devices.
    const startId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runExport();
      });
    });

    return () => {
      cancelAnimationFrame(startId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const runExport = async () => {
    if (!rendererRef.current) {
      Alert.alert('Export failed', 'Renderer was not ready.');
      onCancel();
      return;
    }
    try {
      setPhase('capturing');
      const uri = await encodeChartVideo({
        renderer: rendererRef.current,
        width: dims.width,
        height: dims.height,
        fps,
        durationSec,
        onProgress: (done) => {
          if (cancelledRef.current) return;
          setFramesDone(done);
        },
        onPhase: (next) => {
          if (cancelledRef.current) return;
          setPhase(next);
        },
        shouldCancel: () => cancelledRef.current,
      });

      // Encode finished — the file exists. Deliver it even if a cancel
      // raced in during the seal hold; discarding here would leak the temp
      // file and give the user nothing.
      setPhase('done');
      Animated.timing(sealAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      await new Promise((r) => setTimeout(r, DONE_HOLD_MS));
      onComplete(uri);
    } catch (e) {
      if (cancelledRef.current) return;
      const message = e instanceof Error ? e.message : String(e);
      if (message !== 'cancelled') {
        Alert.alert('Export failed', message);
      }
      onCancel();
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    onCancel();
  };

  // Capture fraction clamps at 1: the encoder reports hold frames past the
  // reveal count, but the ring + preview should sit at the final state, not
  // overshoot.
  const captureFraction = Math.min(1, framesDone / totalFrames);
  const settled = phase === 'muxing' || phase === 'done';
  const ringProgress = settled ? 1 : captureFraction;
  const previewProgress = settled ? 1 : captureFraction;
  const shownFrames = Math.min(framesDone, totalFrames);

  // Preview geometry: render the card at its true dims, then scale the whole
  // tree down into a fixed-width tray. transformOrigin pins it to the top-left
  // so the scaled tree fills the clip box from (0,0).
  const PREVIEW_W = 104;
  const scale = PREVIEW_W / dims.width;
  const previewH = dims.height * scale;

  const title =
    phase === 'muxing'
      ? 'Sealing the file.'
      : phase === 'done'
        ? 'Stamped.'
        : 'Printing frames.';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(14,11,9,0.66)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ width: '100%', maxWidth: 380 }}>
          {/* Panel: a postage parcel. overflow visible so the perforation
              dots can ride just inside the rounded edge as a printed rule. */}
          <View
            style={{
              backgroundColor: c.paper,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.line,
              paddingHorizontal: 22,
              paddingTop: 20,
              paddingBottom: 18,
            }}
          >
            <Perforation color={c.ink3} top />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 16 }}>
              <Eyebrow style={{ color: c.ink3, fontSize: 10, letterSpacing: 1.6 }}>EXPORTING</Eyebrow>
              <TText variant="mono" style={{ fontSize: 9, color: c.ink3, letterSpacing: 1.4 }}>MP4</TText>
            </View>

            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
              {/* Sorting tray — the artifact being mailed. */}
              <View>
                <View
                  style={{
                    width: PREVIEW_W,
                    height: previewH,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: c.line,
                    backgroundColor: c.paper2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: dims.width,
                      height: dims.height,
                      transform: [{ scale }],
                      transformOrigin: 'top left',
                    }}
                    pointerEvents="none"
                  >
                    {renderFrame(previewProgress)}
                  </View>
                </View>

                {/* Wax seal presses down across the tray corner on done. */}
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: -10,
                    bottom: -10,
                    opacity: sealAnim,
                    transform: [
                      { scale: sealAnim.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) },
                    ],
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: c.accent,
                      borderWidth: 2,
                      borderColor: c.accentDeep,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon.check size={20} color={c.paper} strokeWidth={2.6} />
                  </View>
                </Animated.View>
              </View>

              {/* Postmark ring + status copy. */}
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <PostmarkRing
                  size={66}
                  progress={ringProgress}
                  ringColor={c.ink}
                  trackColor={c.line}
                  accent={c.accent}
                >
                  {phase === 'muxing' ? (
                    <ActivityIndicator size="small" color={c.ink2} />
                  ) : phase === 'done' ? (
                    <Icon.check size={22} color={c.accent} strokeWidth={2.4} />
                  ) : (
                    <TText variant="monoSemi" style={{ fontSize: 13, color: c.ink, letterSpacing: -0.4 }}>
                      {Math.round(captureFraction * 100)}
                    </TText>
                  )}
                </PostmarkRing>

                <TText
                  variant="serifItalic"
                  style={{ fontSize: 21, lineHeight: 24, color: c.ink, marginTop: 14, letterSpacing: -0.3 }}
                >
                  {title}
                </TText>

                <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 6, letterSpacing: 0.2 }}>
                  {durationSec}s · {fps} fps · silent
                </TText>
                <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 3, letterSpacing: 0.4 }}>
                  {phase === 'muxing'
                    ? 'MUXING…'
                    : phase === 'done'
                      ? 'CLEARED'
                      : `${shownFrames} / ${totalFrames} FRAMES`}
                </TText>
              </View>
            </View>

            <Pressable
              onPress={handleCancel}
              disabled={phase === 'muxing' || phase === 'done'}
              style={({ pressed }) => [
                {
                  marginTop: 18,
                  paddingVertical: 11,
                  borderRadius: 11,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: c.line,
                  backgroundColor: c.paper2,
                  opacity: pressed || phase === 'muxing' || phase === 'done' ? 0.5 : 1,
                },
              ]}
            >
              <TText style={{ fontSize: 13, color: c.ink, fontWeight: '500' }}>
                {phase === 'done' ? 'Done' : 'Cancel'}
              </TText>
            </Pressable>

            <Perforation color={c.ink3} />
          </View>
        </View>

        {/* The offscreen renderer mounts inside the modal so its lifecycle
            tracks visibility (auto-unmount on close). Lives at left: -10000
            so captureRef can read it without flashing the user. */}
        <VideoExportRenderer
          ref={rendererRef}
          width={dims.width}
          height={dims.height}
          renderFrame={renderFrame}
        />
      </View>
    </Modal>
  );
}

// Printed perforation rule — a row of small dots evoking a stamp's die-cut
// edge. Decorative, not a physical tear, so it never has to colour-match the
// scrim behind the card.
function Perforation({ color, top = false }: { color: string; top?: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        [top ? 'top' : 'bottom']: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
      pointerEvents="none"
    >
      {Array.from({ length: 22 }).map((_, i) => (
        <View key={i} style={{ width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: color, opacity: 0.32 }} />
      ))}
    </View>
  );
}

// Postmark ring — a double-ring date-stamp impression. The outer track is a
// serrated (dashed) ring; a solar arc cancels around it as frames are
// captured, sweeping clockwise from the top.
function PostmarkRing({
  size,
  progress,
  ringColor,
  trackColor,
  accent,
  children,
}: {
  size: number;
  progress: number;
  ringColor: string;
  trackColor: string;
  accent: string;
  children?: ReactNode;
}) {
  const stroke = 2.5;
  const r = size / 2 - stroke;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const innerR = r - 5;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Serrated postmark rim. */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={ringColor}
          strokeWidth={stroke}
          strokeOpacity={0.18}
          strokeDasharray="2 3"
          fill="none"
        />
        {/* Inner concentric ring — the double-ring date-stamp look. */}
        <Circle cx={cx} cy={cy} r={innerR} stroke={ringColor} strokeWidth={1} strokeOpacity={0.14} fill="none" />
        {/* Progress arc, swept clockwise from 12 o'clock. */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, progress)))}
          fill="none"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {children}
    </View>
  );
}
