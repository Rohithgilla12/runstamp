// H.264 + YUV420 chroma subsampling requires even dimensions; the Android
// I420 conversion assumes both are even. Floor to even (min 2).
export function normalizeEvenDims(width: number, height: number): { width: number; height: number } {
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  return { width: even(width), height: even(height) };
}

// A 1-frame encode can produce a degenerate file (the Android muxer never
// starts on a too-short stream). Guarantee at least 2 frames.
export function clampTotalFrames(total: number): number {
  return Math.max(2, total);
}
