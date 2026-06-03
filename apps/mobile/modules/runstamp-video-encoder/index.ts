// Native bridge for the platform MP4 encoder. iOS wraps AVAssetWriter +
// CVPixelBufferPool; Android wraps MediaCodec (H.264) + MediaMuxer. The
// JS contract is identical on both platforms: start a session, push PNG
// frames by index, finish to get a file:// URI back.
//
// The caller is responsible for producing the PNG frames (typically via
// react-native-view-shot driving a chart at progress = i/totalFrames),
// for invariants like frameIndex strictly increasing, and for calling
// cancelEncoding on user abort so the underlying file handles close.

import { requireNativeModule } from 'expo-modules-core';

interface NativeRunstampVideoEncoder {
  startEncoding(options: StartOptions): Promise<{ sessionId: string; outputPath: string }>;
  addFrame(sessionId: string, pngPath: string, frameIndex: number): Promise<void>;
  finishEncoding(sessionId: string): Promise<{ uri: string }>;
  cancelEncoding(sessionId: string): Promise<void>;
}

export interface StartOptions {
  /** Output video width in pixels. Must be even (H.264/YUV420). Should match the source PNG width. */
  width: number;
  /** Output video height in pixels. Must be even (H.264/YUV420). Should match the source PNG height. */
  height: number;
  /** Frames per second. Presentation timestamps are computed as frameIndex / fps. */
  fps: number;
  /**
   * Absolute file path where the MP4 will be written. When omitted, the
   * native side picks a unique path in the platform's app cache dir
   * (NSTemporaryDirectory on iOS, context.cacheDir on Android) and
   * returns it on the resolved promise.
   */
  outputPath?: string;
}

export interface EncodingHandle {
  /** Opaque session id used by addFrame / finishEncoding / cancelEncoding. */
  sessionId: string;
  /** Resolved absolute output path. Set even when caller omitted outputPath. */
  outputPath: string;
}

const native = requireNativeModule<NativeRunstampVideoEncoder>('RunstampVideoEncoder');

export async function startEncoding(options: StartOptions): Promise<EncodingHandle> {
  const { sessionId, outputPath } = await native.startEncoding({
    width: options.width,
    height: options.height,
    fps: options.fps,
    outputPath: options.outputPath ?? '',
  });
  return { sessionId, outputPath };
}

export async function addFrame(sessionId: string, pngPath: string, frameIndex: number): Promise<void> {
  await native.addFrame(sessionId, pngPath, frameIndex);
}

export async function finishEncoding(sessionId: string): Promise<string> {
  const { uri } = await native.finishEncoding(sessionId);
  return uri;
}

export async function cancelEncoding(sessionId: string): Promise<void> {
  await native.cancelEncoding(sessionId);
}
