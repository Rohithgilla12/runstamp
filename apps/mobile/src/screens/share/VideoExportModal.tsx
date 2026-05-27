// VideoExportModal
//
// Modal that drives a single chart's video export. Mounts the offscreen
// renderer, walks the encoder through 90 frames (3s @ 30fps), shows a
// progress bar during capture and an indeterminate spinner during mux,
// then hands the resulting MP4 URI back to the caller.
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
import { ActivityIndicator, Alert, Modal, Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { Card } from '../../design/atoms';
import { Eyebrow, TText } from '../../design/typography';
import {
  encodeChartVideo,
  VideoExportRenderer,
  type VideoExportRendererHandle,
} from '../../services/videoExport';

type Phase = 'preparing' | 'capturing' | 'muxing' | 'done';

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

  useEffect(() => {
    if (!visible) {
      cancelledRef.current = false;
      setPhase('preparing');
      setFramesDone(0);
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
      if (cancelledRef.current) return;
      setPhase('done');
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

  const captureFraction = totalFrames > 0 ? framesDone / totalFrames : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Card style={{ width: '100%', backgroundColor: c.paper, padding: 22 }}>
          <Eyebrow style={{ color: c.ink3, fontSize: 10, letterSpacing: 1.4 }}>
            EXPORTING VIDEO
          </Eyebrow>
          <TText
            variant="serif"
            style={{ fontSize: 22, lineHeight: 26, color: c.ink, marginTop: 6, letterSpacing: -0.3 }}
          >
            {phase === 'muxing'
              ? 'Sealing the file.'
              : phase === 'done'
                ? 'Handing it off.'
                : 'Drawing frames.'}
          </TText>
          <TText style={{ fontSize: 12, color: c.ink3, marginTop: 6 }}>
            {durationSec}s · {dims.width}×{dims.height} · {fps} fps · silent
          </TText>

          {/* Progress bar — fills during the capture phase, then becomes
              an indeterminate band while ffmpeg muxes (which has no
              progress signal we can hook). */}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.line, marginTop: 16, overflow: 'hidden' }}>
            <View
              style={{
                width: phase === 'muxing' ? '100%' : `${Math.round(captureFraction * 100)}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: c.accent,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' }}>
            <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>
              {phase === 'muxing' ? 'MUXING…' : `${framesDone} / ${totalFrames} FRAMES`}
            </TText>
            {phase === 'muxing' && <ActivityIndicator size="small" color={c.ink2} />}
          </View>

          <Pressable
            onPress={handleCancel}
            disabled={phase === 'done'}
            style={({ pressed }) => [
              {
                marginTop: 18,
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.paper2,
                opacity: pressed || phase === 'done' ? 0.55 : 1,
              },
            ]}
          >
            <TText style={{ fontSize: 13, color: c.ink, fontWeight: '500' }}>Cancel</TText>
          </Pressable>
        </Card>

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
