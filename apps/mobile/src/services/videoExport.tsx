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
import RNShare from 'react-native-share';
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

/**
 * Opens the OS share sheet for the encoded MP4. Uses react-native-share
 * (already in the project for the IG Stories editor flow) because RN's
 * built-in Share.share is unreliable with video file URIs on iOS — the
 * share sheet often silently fails to present or rejects file:// schemes
 * for MP4 type.
 *
 * Adds a short delay so the caller's export-progress modal has time to
 * fully dismiss before we try to present another modal. Without it, iOS
 * drops the second presentation while it's still tearing down the first
 * and the user sees nothing happen at all.
 */
export async function shareExportedVideo(uri: string, message: string): Promise<void> {
  // Modal dismiss animation is ~250–300ms on iOS; 400ms is a safe cover.
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  await RNShare.open({
    url: uri,
    type: 'video/mp4',
    failOnCancel: false,
    message,
  });
}

export interface EncodeOptions {
  renderer: VideoExportRendererHandle;
  width: number;
  height: number;
  fps: number;
  /** Duration of the reveal animation (progress sweeping 0 → 1). */
  durationSec: number;
  /**
   * Hold-at-end duration in seconds. After the reveal finishes, the video
   * stays on the final frame for this long before muxing closes the file.
   * Universal share-video polish — lets the viewer's eye absorb the final
   * state instead of cutting on the last reveal frame. Default 0.5s.
   *
   * Hold frames re-use the last captured PNG (no extra captureRef calls),
   * so this is nearly free — only the muxer has more frames to write.
   */
  holdSec?: number;
  /** Frame progress callback for UI. Fires after each frame is captured. */
  onProgress?: (capturedFrames: number, totalFrames: number) => void;
  /** Phase callback. Fires once when we move from frame capture to muxing. */
  onPhase?: (phase: 'capturing' | 'muxing') => void;
  /** Set to true to abort the encode after the current frame. */
  shouldCancel?: () => boolean;
}

/**
 * Walks the reveal frames (`durationSec * fps`) plus optional hold frames
 * (`holdSec * fps`) at the final state, captures each via captureRef, and
 * feeds them to the native encoder. Returns the final MP4's file:// URI.
 *
 * Hold frames reuse the last captured PNG path — no extra captureRef
 * calls during the hold, so the only cost is muxer write time.
 *
 * If `shouldCancel()` returns true between frames, the encode is aborted
 * and the partial file is deleted. Throws on any encoder error.
 */
export async function encodeChartVideo(options: EncodeOptions): Promise<string> {
  const { renderer, width, height, fps, durationSec, holdSec = 0.5, onProgress, onPhase, shouldCancel } = options;

  const revealFrames = Math.max(1, Math.round(fps * durationSec));
  const holdFrames = Math.max(0, Math.round(fps * holdSec));
  const totalFrames = revealFrames + holdFrames;
  onPhase?.('capturing');

  const { sessionId } = await startEncoding({ width, height, fps });

  // Remembers the PNG of the final reveal frame so we can feed it to the
  // encoder repeatedly during the hold without re-capturing identical
  // pixels. captureRef is the slow part of the loop; this skips it for
  // ~15 frames on the typical 3s reveal + 0.5s hold setup.
  let lastFramePath: string | null = null;

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (shouldCancel?.()) {
        await cancelEncoding(sessionId).catch(() => undefined);
        throw new Error('cancelled');
      }

      const inReveal = i < revealFrames;

      if (inReveal) {
        // Reveal frames sweep progress 0..1 across `revealFrames` steps.
        const progress = revealFrames === 1 ? 1 : i / (revealFrames - 1);
        await renderer.setProgress(progress);

        lastFramePath = await captureRef(renderer.viewRef, {
          format: 'png',
          result: 'tmpfile',
          width,
          height,
        });
      }

      if (!lastFramePath) {
        // Defensive — shouldn't happen because i=0 is always a reveal
        // frame (revealFrames >= 1), but TypeScript doesn't know that.
        throw new Error('encoder lost reveal frame');
      }

      await addFrame(sessionId, lastFramePath, i);

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
