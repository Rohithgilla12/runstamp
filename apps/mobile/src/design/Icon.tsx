import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type IconProps = {
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
};

type IconSet = Record<string, React.FC<IconProps>>;

// `stroke()` was previously cloning children via React.Children.map +
// cloneElement to set stroke + strokeWidth + linecaps on each Path. That
// worked for single-Path icons but silently broke every multi-path icon
// wrapped in a Fragment (<>...</>) — React.Children.map sees the Fragment
// as one element, clones it with stroke props that don't exist on it, and
// the inner Paths render with no stroke at all (invisible).
//
// SVG's <G> element propagates stroke attributes to descendants natively,
// so wrapping the path in a group is both simpler and correct regardless
// of whether the path arg is a Fragment, a single element, or an array.
const stroke = (path: React.ReactNode, defaultStrokeWidth = 1.7) =>
  function StrokeIcon({ size = 20, color = 'currentColor', strokeWidth }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <G
          stroke={color}
          strokeWidth={strokeWidth ?? defaultStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {path}
        </G>
      </Svg>
    );
  };

export const Icon: IconSet = {
  home: stroke(
    <>
      <Path d="M3 11.5L12 4l9 7.5" />
      <Path d="M5 10v10h14V10" />
    </>
  ),
  chart: stroke(
    <>
      <Path d="M4 20V8" />
      <Path d="M10 20V4" />
      <Path d="M16 20v-8" />
      <Path d="M22 20H2" />
    </>
  ),
  globe: stroke(
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18" />
      <Path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </>
  ),
  user: stroke(
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
    </>
  ),
  back: stroke(<Path d="M15 5l-7 7 7 7" />, 1.8),
  share: stroke(
    <>
      <Path d="M12 3v13" />
      <Path d="M7 8l5-5 5 5" />
      <Rect x={4} y={16} width={16} height={5} rx={1} />
    </>
  ),
  more: function More({ size = 20, color = '#000' }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Circle cx={5} cy={12} r={1.5} />
        <Circle cx={12} cy={12} r={1.5} />
        <Circle cx={19} cy={12} r={1.5} />
      </Svg>
    );
  },
  plus: stroke(<Path d="M12 5v14M5 12h14" />, 1.8),
  check: stroke(<Path d="M5 12l5 5L20 7" />, 2),
  heart: stroke(<Path d="M12 21s-7-4.4-9.5-9C.5 7.8 4 4 8 4c2 0 3.5 1 4 2 .5-1 2-2 4-2 4 0 7.5 3.8 5.5 8-2.5 4.6-9.5 9-9.5 9z" />),
  mountain: stroke(<Path d="M3 19l6-11 4 7 3-5 5 9z" />),
  bolt: function Bolt({ size = 20, color = '#000' }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      </Svg>
    );
  },
  flame: stroke(<Path d="M12 3c1 4 5 5 5 10a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />),
  clock: stroke(
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  ruler: stroke(
    <>
      <Path d="M3 17L17 3l4 4L7 21z" />
      <Path d="M7 13l2 2M10 10l2 2M13 7l2 2" />
    </>
  ),
  shoe: stroke(
    <>
      <Path d="M2 15c0-1 1-2 2-2l5-1 3-4 4 1 6 3v3a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
      <Path d="M9 12l1 3M13 13l1 2" />
    </>
  ),
  cam: stroke(
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2} />
      <Path d="M8 7l2-3h4l2 3" />
      <Circle cx={12} cy={13} r={4} />
    </>
  ),
  sun: stroke(
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: stroke(<Path d="M20 14A8 8 0 119.5 4 7 7 0 0020 14z" />),
  cloud: stroke(<Path d="M7 18a5 5 0 010-10 6 6 0 0111-2 4 4 0 011 8H7z" />),
  fog: stroke(<Path d="M3 10h18M3 14h12M5 18h14" />),
  rain: stroke(
    <>
      <Path d="M7 15a5 5 0 010-10 6 6 0 0111-2 4 4 0 011 8H7z" />
      <Path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
    </>
  ),
  pin: stroke(
    <>
      <Path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" />
      <Circle cx={12} cy={9} r={2.5} />
    </>
  ),
  chevR: stroke(<Path d="M9 5l7 7-7 7" />, 1.8),
  chevD: stroke(<Path d="M5 9l7 7 7-7" />, 1.8),
  filter: stroke(<Path d="M3 6h18M6 12h12M10 18h4" />),
  layers: stroke(
    <>
      <Path d="M12 3l9 5-9 5-9-5 9-5z" />
      <Path d="M3 13l9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  sliders: stroke(
    <>
      <Path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M20 18h0" />
      <Circle cx={16} cy={6} r={2} />
      <Circle cx={8} cy={12} r={2} />
    </>
  ),
  download: stroke(
    <>
      <Path d="M12 3v13M7 11l5 5 5-5" />
      <Path d="M4 20h16" />
    </>
  ),
  trash: stroke(
    <>
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </>
  ),
  privacy: stroke(<Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />),
  strava: function Strava({ size = 20, color = '#000' }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M7 13L12 3l5 10h-3l-2-4-2 4H7zm5 0l3 6h-2l-1-2-1 2h-2l3-6z" />
      </Svg>
    );
  },
  apple: function Apple({ size = 20, color = '#000' }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M17.7 12.6c0-2.4 2-3.5 2.1-3.6-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8C7.3 7.2 6 8.2 5.2 9.7c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.7 3-.7s1.8.7 3.1.7c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-.9-2.5-3.8zm-2.4-7c.6-.8 1-1.9.9-3-1 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.3-.5 2.9-1.3z" />
      </Svg>
    );
  },
  github: function Github({ size = 20, color = '#000' }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z" />
      </Svg>
    );
  },
  spark: function Spark({ size = 20, color = '#000' }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" />
      </Svg>
    );
  },
  x: stroke(<Path d="M6 6l12 12M18 6L6 18" />, 1.8)
};
