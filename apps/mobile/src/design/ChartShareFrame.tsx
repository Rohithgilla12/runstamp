// ChartShareFrame
//
// 9:16 share-card wrapper for any single chart — the visual equivalent of
// what PeriodShareCard does for the period summary. Used by the video
// export pipeline when capturing a chart at 1080×1920 native dims for
// Stories.
//
// `scale` parameterizes every spatial value so the same component can
// render at 360×640 logical for in-app preview AND at 1080×1920 for the
// final video. The chart slot is transform-scaled so embedded charts
// (which carry their own fixed SVG dimensions) fill the frame at the
// target resolution without each chart needing its own scale prop.
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

// All charts that ride inside this frame are sized at ~320 logical pt
// wide. Hardcoding it here lets us reserve the right block of space and
// drive the transform-scale wrapper.
const CHART_SLOT_W = 320;
const CHART_SLOT_H = 320;

interface Props {
  title: string;
  subtitle?: string;
  /** Renders the chart at the given inner progress (0..1). */
  renderChart: (chartProgress: number) => ReactNode;
  /** Outer reveal progress (0..1). Undefined = static (full frame). */
  progress?: number;
  /** Linear scale for every spatial dimension. Defaults to 1. */
  scale?: number;
}

export function ChartShareFrame({ title, subtitle, renderChart, progress, scale = 1 }: Props) {
  const c = useColors();
  const s = scale;
  const revealing = progress !== undefined;

  const W = CHART_SHARE_FRAME_WIDTH * s;
  const H = CHART_SHARE_FRAME_HEIGHT * s;
  const PAD = 26 * s;

  // Title gets the first slice; chart reveal owns the middle/back; footer
  // settles last. Eased so endpoints feel symmetric.
  const titleT = revealing ? easeInOut(clamp01(progress / 0.18)) : 1;
  const chartProgress = revealing ? clamp01((progress - 0.12) / 0.83) : 1;
  const footerT = revealing ? clamp01((progress - 0.85) / 0.15) : 1;

  return (
    <View style={{ width: W, height: H, backgroundColor: c.paper, padding: PAD, position: 'relative' }}>
      {/* Top motif row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Postmark scale={s} />
        <Eyebrow style={{ color: c.ink3, fontSize: 10 * s, letterSpacing: 1.4 * s }}>VIA RUNSTAMP</Eyebrow>
      </View>

      {/* Title + subtitle */}
      <View style={{ marginTop: 28 * s, opacity: titleT }}>
        <Eyebrow style={{ color: c.accent, fontSize: 11 * s, letterSpacing: 1.6 * s }}>CHART</Eyebrow>
        <TText
          variant="serif"
          style={{ fontSize: 32 * s, lineHeight: 36 * s, color: c.ink, marginTop: 4 * s, letterSpacing: -0.6 * s }}
        >
          {title}
        </TText>
        {subtitle && (
          <TText
            variant="mono"
            style={{ fontSize: 12 * s, color: c.ink2, marginTop: 6 * s, letterSpacing: -0.1 * s }}
          >
            {subtitle}
          </TText>
        )}
      </View>

      {/* Chart slot. Embedded charts (HeatmapCalendar / CumulativeChart /
          etc.) have hardcoded ~320pt SVG widths — we wrap the renderChart
          output in a transform-scale container so it fills the scaled
          frame without each chart needing a scale prop of its own. */}
      <View
        style={{
          marginTop: 32 * s,
          alignItems: 'center',
          flex: 1,
        }}
      >
        <View
          style={{
            width: CHART_SLOT_W * s,
            height: CHART_SLOT_H * s,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: CHART_SLOT_W,
              height: CHART_SLOT_H,
              transform: [{ scale: s }],
              transformOrigin: 'top left',
            }}
          >
            {renderChart(chartProgress)}
          </View>
        </View>
      </View>

      {/* Footer lockup */}
      <View
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          bottom: PAD - 4 * s,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: footerT,
        }}
      >
        <RunstampMark tone="ink" opacity={0.55} />
        <TText variant="mono" style={{ fontSize: 10 * s, color: c.ink3, letterSpacing: 1.4 * s }}>
          {new Date().getFullYear()}
        </TText>
      </View>
    </View>
  );
}

// Postmark — same vocabulary as PeriodShareCard / YearInStampsCard. The
// only brand motif on this surface; the chart carries the rest.
function Postmark({ scale: s }: { scale: number }) {
  const c = useColors();
  const size = 38 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1 * s} stroke={c.ink} strokeWidth={1 * s} fill="none" opacity={0.7} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4 * s}
        stroke={c.ink}
        strokeWidth={0.5 * s}
        strokeDasharray={`${2 * s} ${2 * s}`}
        fill="none"
        opacity={0.55}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + 4 * s}
        textAnchor="middle"
        fontSize={10 * s}
        fontWeight="600"
        fill={c.ink}
        opacity={0.8}
      >
        RS
      </SvgText>
      <Path d={`M${size / 2} ${4 * s} L${size / 2} ${9 * s}`} stroke={c.ink} strokeWidth={0.5 * s} opacity={0.5} />
      <Path d={`M${size / 2} ${size - 9 * s} L${size / 2} ${size - 4 * s}`} stroke={c.ink} strokeWidth={0.5 * s} opacity={0.5} />
    </Svg>
  );
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
