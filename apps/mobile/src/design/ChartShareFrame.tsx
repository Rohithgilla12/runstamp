// ChartShareFrame
//
// 9:16 share-card wrapper for any single chart — the visual equivalent of
// what PeriodShareCard does for the period summary. Used by the video
// export pipeline when capturing a chart at 1080×1920 native dims for
// Stories.
//
// The frame holds the brand chrome (postmark + "via Runstamp" eyebrow +
// title + footer mark) at a fixed 360×640 logical size; the chart slot
// sits in the middle and receives the progress prop directly.
//
// Reveal phases when progress is set:
//   0–18%     title + subtitle fade in
//   12–95%    chart's own reveal animation (progress passed through)
//   85–100%   footer mark settles

import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { useColors } from './theme';
import { Eyebrow, TText } from './typography';
import { RunstampMark } from './RunstampMark';
import { easeInOut } from './charts/reveal';

export const CHART_SHARE_FRAME_WIDTH = 360;
export const CHART_SHARE_FRAME_HEIGHT = 640;

interface Props {
  title: string;
  subtitle?: string;
  /** Renders the chart at the given inner progress (0..1). */
  renderChart: (chartProgress: number) => ReactNode;
  /** Outer reveal progress (0..1). Undefined = static (full frame). */
  progress?: number;
}

const W = CHART_SHARE_FRAME_WIDTH;
const H = CHART_SHARE_FRAME_HEIGHT;
const PAD = 26;

export function ChartShareFrame({ title, subtitle, renderChart, progress }: Props) {
  const c = useColors();
  const revealing = progress !== undefined;

  // Title gets the first slice; chart reveal owns the middle/back; footer
  // settles last. Eased so endpoints feel symmetric.
  const titleT = revealing ? easeInOut(clamp01(progress / 0.18)) : 1;
  // The chart's internal progress starts at 0.12 and reaches 1 at 0.95
  // (saves a small hold at the end for the footer to settle).
  const chartProgress = revealing ? clamp01((progress - 0.12) / 0.83) : 1;
  const footerT = revealing ? clamp01((progress - 0.85) / 0.15) : 1;

  return (
    <View style={{ width: W, height: H, backgroundColor: c.paper, padding: PAD, position: 'relative' }}>
      {/* Top motif row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Postmark />
        <Eyebrow style={{ color: c.ink3, fontSize: 10, letterSpacing: 1.4 }}>VIA RUNSTAMP</Eyebrow>
      </View>

      {/* Title + subtitle */}
      <View style={{ marginTop: 28, opacity: titleT }}>
        <Eyebrow style={{ color: c.accent, fontSize: 11, letterSpacing: 1.6 }}>CHART</Eyebrow>
        <TText
          variant="serif"
          style={{ fontSize: 32, lineHeight: 36, color: c.ink, marginTop: 4, letterSpacing: -0.6 }}
        >
          {title}
        </TText>
        {subtitle && (
          <TText
            variant="mono"
            style={{ fontSize: 12, color: c.ink2, marginTop: 6, letterSpacing: -0.1 }}
          >
            {subtitle}
          </TText>
        )}
      </View>

      {/* Chart slot. Centered vertically below the title; chart components
          are sized at their natural widths (~320pt), so a small horizontal
          adjustment is enough to center them in the frame's interior. */}
      <View
        style={{
          marginTop: 32,
          alignItems: 'center',
          // Carve out for footer (~PAD + 28 lockup) so the chart doesn't
          // collide with it on tall outputs.
          flex: 1,
        }}
      >
        {renderChart(chartProgress)}
      </View>

      {/* Footer lockup */}
      <View
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          bottom: PAD - 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: footerT,
        }}
      >
        <RunstampMark tone="ink" opacity={0.55} />
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3, letterSpacing: 1.4 }}>
          {new Date().getFullYear()}
        </TText>
      </View>
    </View>
  );
}

// Postmark — same vocabulary as PeriodShareCard / YearInStampsCard. The
// only brand motif on this surface; the chart carries the rest.
function Postmark() {
  const c = useColors();
  const size = 38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} stroke={c.ink} strokeWidth={1} fill="none" opacity={0.7} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4}
        stroke={c.ink}
        strokeWidth={0.5}
        strokeDasharray="2 2"
        fill="none"
        opacity={0.55}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="600"
        fill={c.ink}
        opacity={0.8}
      >
        RS
      </SvgText>
      <Path d={`M${size / 2} 4 L${size / 2} 9`} stroke={c.ink} strokeWidth={0.5} opacity={0.5} />
      <Path d={`M${size / 2} ${size - 9} L${size / 2} ${size - 4}`} stroke={c.ink} strokeWidth={0.5} opacity={0.5} />
    </Svg>
  );
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
