import React, { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import { useColors } from '../theme';
import { TText } from '../typography';

interface TooltipState {
  index: number;
  px: number;       // x within the overlay (0 .. width)
}

interface Props<T> {
  /** Series ordered left-to-right. Must match the underlying chart. */
  series: readonly T[];
  /** Pixel x of the first plotted point (LEFT margin in the chart). */
  left: number;
  /** Pixel x of the last plotted point (W - RIGHT). */
  right: number;
  /** Total chart width (matches the underlying Svg width). */
  width: number;
  /** Total chart height (matches the underlying Svg height). */
  height: number;
  /**
   * Format the date label shown in the tooltip header. Receives the touched
   * item plus its index in the series — handy for charts whose y-value
   * doesn't carry its own timestamp (e.g. activity-level streams that are
   * just `number[]` with an implicit time-per-sample).
   */
  formatPrimary: (item: T, index: number) => string;
  /** Format the value line shown below the date. */
  formatValue: (item: T, index: number) => string;
  /** Optional dot colour for the marker drawn at the touched point. */
  dotColor?: string;
  /** Compute the y-pixel of a given series item — used to position the dot. */
  pointY?: (item: T, index: number) => number;
}

// Transparent overlay that turns any line/scatter chart into a tap-to-read
// one. Maps the touch x to the nearest series index, draws a thin guide
// line, and floats a small callout above the marker.
//
// Sits on top of the underlying Svg via absolute positioning and matching
// width/height. Touches inside the [left, right] band scrub through the
// series; touches outside it dismiss the tooltip.
export function ChartTooltip<T>({
  series, left, right, width, height,
  formatPrimary, formatValue, dotColor, pointY,
}: Props<T>) {
  const c = useColors();
  const [state, setState] = useState<TooltipState | null>(null);
  const [layoutW, setLayoutW] = useState(width);

  const handleTouch = useCallback((e: GestureResponderEvent) => {
    if (series.length === 0) return;
    // locationX is relative to the overlay, which sits on top of the Svg.
    const px = e.nativeEvent.locationX;
    // Scale touch from layout coordinates back to Svg coordinates (the
    // Svg renders at its intrinsic `width`, but the overlay may be a
    // different layout width if the parent constrains it — though in
    // practice the parent centers both at the same intrinsic size).
    const sx = (px / Math.max(1, layoutW)) * width;
    if (sx < left - 6 || sx > right + 6) {
      setState(null);
      return;
    }
    const clamped = Math.min(right, Math.max(left, sx));
    const ratio = (clamped - left) / Math.max(1, right - left);
    const idx = Math.round(ratio * (series.length - 1));
    const safe = Math.max(0, Math.min(series.length - 1, idx));
    setState({ index: safe, px });
  }, [series, left, right, layoutW, width]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setLayoutW(e.nativeEvent.layout.width);
  }, []);

  const dismiss = useCallback(() => setState(null), []);

  const item = state ? series[state.index] : null;

  return (
    <View
      onLayout={handleLayout}
      onStartShouldSetResponder={() => series.length > 0}
      onMoveShouldSetResponder={() => series.length > 0}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={dismiss}
      onResponderTerminate={dismiss}
      style={{
        position: 'absolute',
        left: 0, top: 0, width: '100%', height,
      }}
    >
      {item && state && (
        <>
          {/* Vertical guide line */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: state.px - 0.5,
              top: 6,
              bottom: 22,
              width: 1,
              backgroundColor: c.ink,
              opacity: 0.25,
            }}
          />
          {/* Marker dot */}
          {pointY && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: state.px - 4,
                top: pointY(item, state.index) - 4,
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: dotColor ?? c.ink,
                borderWidth: 1.5, borderColor: c.paper,
              }}
            />
          )}
          {/* Callout */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: clampCallout(state.px - 60, layoutW),
              top: 2,
              minWidth: 90,
              paddingHorizontal: 8, paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: c.ink,
            }}
          >
            <TText variant="mono" style={{ fontSize: 9, color: c.paper, opacity: 0.7, letterSpacing: 0.5 }}>
              {formatPrimary(item, state.index)}
            </TText>
            <TText variant="monoMedium" style={{ fontSize: 13, color: c.paper, marginTop: 1 }}>
              {formatValue(item, state.index)}
            </TText>
          </View>
        </>
      )}
    </View>
  );
}

function clampCallout(x: number, layoutW: number): number {
  const width = 120;
  if (x < 4) return 4;
  if (x + width > layoutW - 4) return layoutW - width - 4;
  return x;
}
