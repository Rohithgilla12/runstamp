// Video export pipeline.
//
// Drives the per-frame loop that walks an off-screen chart from progress=0
// to progress=1 over `durationSec * fps` frames, capturing each frame as
// PNG and feeding it to the native MP4 encoder.
//
// The split between this file and the encoder module:
//
//   This file (videoExport.tsx)        : JS-side orchestration
//     - <VideoExportRenderer>          : offscreen host component, owns
//                                        the progress state and exposes
//                                        an imperative setProgress().
//     - encodeChartVideo()             : the per-frame loop. Takes a
//                                        renderer handle + capture ref,
//                                        returns the final MP4 uri.
//
//   runstamp-video-encoder/            : platform-native encoder bridge
//                                        (AVAssetWriter / MediaCodec).
//
// The two-rAF wait between setProgress() and captureRef() lets React
// commit the new tree AND lets the SVG / native draw pipeline settle
// before we snap. Without it the first 1-3 frames can show stale state.

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import {
  addFrame,
  cancelEncoding,
  finishEncoding,
  startEncoding,
} from '../../modules/runstamp-video-encoder';

export interface VideoExportRendererHandle {
  /** Updates the offscreen tree's progress and resolves after paint settles. */
  setProgress: (progress: number) => Promise<void>;
  /** The native view ref for captureRef(). */
  viewRef: React.RefObject<View | null>;
}

interface RendererProps {
  /**
   * Renders the chart / share card at the given progress. Called on every
   * progress state change. Must be a stable function (memo the parent or
   * useCallback) to avoid re-mount thrash.
   */
  renderFrame: (progress: number) => ReactNode;
  /**
   * Logical width / height of the offscreen tree. captureRef will render
   * at this size; the encoder uses the same dimensions for the MP4.
   */
  width: number;
  height: number;
}

/**
 * Mounts the chart off-screen (left: -10000) so it doesn't flash in the UI
 * while we drive its progress prop frame-by-frame. Exposes setProgress as
 * an imperative ref so the encoder service can await each commit.
 *
 * State carries a monotonic `version` alongside `progress` so that calling
 * setProgress(0) on the first frame (when the initial state is also 0)
 * still forces a re-render. Otherwise React bails out on Object.is(0, 0),
 * the post-render effect never fires, and the awaited Promise hangs —
 * which manifests as the export modal stuck at "0 / N FRAMES" forever.
 */
export const VideoExportRenderer = forwardRef<VideoExportRendererHandle, RendererProps>(
  function VideoExportRenderer({ renderFrame, width, height }, ref) {
    const [state, setState] = useState({ progress: 0, version: 0 });
    const viewRef = useRef<View | null>(null);
    const pendingResolveRef = useRef<(() => void) | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        setProgress: (p: number) => {
          return new Promise<void>((resolve) => {
            // Resolve any prior unresolved call first — protects against
            // overlapping setProgress invocations (shouldn't happen in
            // the normal serial loop, but cheap insurance).
            const prior = pendingResolveRef.current;
            if (prior) prior();
            pendingResolveRef.current = resolve;
            setState((prev) => ({ progress: p, version: prev.version + 1 }));
          });
        },
        viewRef,
      }),
      [],
    );

    useEffect(() => {
      const resolve = pendingResolveRef.current;
      if (!resolve) return;
      // Two rAF ticks: first to commit React's render to native, second
      // to let the SVG renderer paint before captureRef snapshots it.
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          pendingResolveRef.current = null;
          resolve();
        });
      });
      return () => cancelAnimationFrame(id);
    }, [state.version]);

    return (
      <View
        ref={viewRef}
        collapsable={false}
        pointerEvents="none"
        style={{ position: 'absolute', left: -10000, top: 0, width, height }}
      >
        {renderFrame(state.progress)}
      </View>
    );
  },
);

export interface EncodeOptions {
  renderer: VideoExportRendererHandle;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  /** Frame progress callback for UI. Fires after each frame is captured. */
  onProgress?: (capturedFrames: number, totalFrames: number) => void;
  /** Phase callback. Fires once when we move from frame capture to muxing. */
  onPhase?: (phase: 'capturing' | 'muxing') => void;
  /** Set to true to abort the encode after the current frame. */
  shouldCancel?: () => boolean;
}

/**
 * Walks `durationSec * fps` frames, captures each via captureRef, and
 * feeds them to the native encoder. Returns the final MP4's file:// URI.
 *
 * If `shouldCancel()` returns true between frames, the encode is aborted
 * and the partial file is deleted. Throws on any encoder error.
 */
export async function encodeChartVideo(options: EncodeOptions): Promise<string> {
  const { renderer, width, height, fps, durationSec, onProgress, onPhase, shouldCancel } = options;

  const totalFrames = Math.max(1, Math.round(fps * durationSec));
  onPhase?.('capturing');

  const { sessionId } = await startEncoding({ width, height, fps });

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (shouldCancel?.()) {
        await cancelEncoding(sessionId).catch(() => undefined);
        throw new Error('cancelled');
      }

      // Last frame lands exactly at progress=1; first at 0.
      const progress = totalFrames === 1 ? 1 : i / (totalFrames - 1);
      await renderer.setProgress(progress);

      const pngPath = await captureRef(renderer.viewRef, {
        format: 'png',
        result: 'tmpfile',
        width,
        height,
      });

      await addFrame(sessionId, pngPath, i);

      // captureRef writes to OS temp dir and the OS will reap stale files
      // eventually, but explicitly cleaning up keeps the cache from
      // growing during long sessions. Best-effort — ignore failures.
      // We don't have expo-file-system; captureRef's tmpfile lives in
      // platform tmp, which the OS clears periodically.

      onProgress?.(i + 1, totalFrames);
    }

    onPhase?.('muxing');
    const uri = await finishEncoding(sessionId);
    return uri;
  } catch (e) {
    // Best-effort cleanup. cancelEncoding is a no-op if the session
    // already finished or never started, so calling it on any failure
    // path is safe.
    await cancelEncoding(sessionId).catch(() => undefined);
    throw e;
  }
}
