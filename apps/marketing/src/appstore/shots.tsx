// App Store screenshot set — ordered. Each shot pairs a marketing headline
// with a screen. The screen defaults to a designed render so the whole set
// builds with zero captures; swap any `screen` to <Capture .../> once you've
// grabbed a real simulator screenshot into public/captures/.

import { SCREEN_W, SCREEN_H } from "./layout";
import {
  HomeScreen,
  EditorScreen,
  AnalyticsScreen,
  PlacesScreen,
  StampsScreen,
  YearScreen,
  // Capture,  // ← swap a designed screen for a real capture with this
} from "./screens";
import { colors } from "../theme";

export interface Shot {
  id: string;
  eyebrow: string;
  headline: React.ReactNode;
  sub: string;
  // A real simulator capture (path under public/), rendered full-bleed with no
  // device frame. When set it takes precedence over `screen`.
  capture?: string;
  // Designed fallback, rendered inside a phone frame. Used when no capture.
  screen: React.ReactNode;
}

const s = { w: SCREEN_W, h: SCREEN_H };

export const SHOT_LIST: Shot[] = [
  {
    id: "hero",
    eyebrow: "Runstamp",
    headline: (
      <>
        Collect a <span style={{ color: colors.accent }}>stamp</span>
        <br />for every run.
      </>
    ),
    sub: "Turn the runs you already record into something worth keeping.",
    capture: "captures/rs-1-home.png",
    screen: <HomeScreen {...s} />,
  },
  {
    id: "editor",
    eyebrow: "Share-card editor",
    headline: (
      <>
        Every run,
        <br />a <span style={{ color: colors.accent }}>keepsake</span>.
      </>
    ),
    sub: "Twelve templates. Drop a photo, drag a stat, export to your story.",
    capture: "captures/rs-2-editor.png",
    screen: <EditorScreen {...s} />,
  },
  {
    id: "analytics",
    eyebrow: "Analytics",
    headline: (
      <>
        Read your training
        <br /><span style={{ color: colors.accent }}>honestly</span>.
      </>
    ),
    sub: "VO₂ max trend, MAF aerobic pace, decoupling and TSB — no paywall.",
    capture: "captures/rs-3-analytics.png",
    screen: <AnalyticsScreen {...s} />,
  },
  {
    id: "places",
    eyebrow: "Places",
    headline: (
      <>
        A passport for the
        <br /><span style={{ color: colors.accent }}>cities</span> you've run.
      </>
    ),
    sub: "Forty-seven cities. Six countries. Every one of them stamped.",
    capture: "captures/rs-4-places.png",
    screen: <PlacesScreen {...s} />,
  },
  {
    id: "stamps",
    eyebrow: "Stamp catalogue",
    headline: (
      <>
        Earned by <span style={{ color: colors.accent }}>running</span>.
        <br />Not by tapping.
      </>
    ),
    sub: "Twenty-three stamps and counting — Common, Rare, Mythic.",
    capture: "captures/rs-5-stamps.png",
    screen: <StampsScreen {...s} />,
  },
  {
    id: "year",
    eyebrow: "Year in stamps",
    headline: (
      <>
        Your year,
        <br /><span style={{ color: colors.accent }}>stamped</span>.
      </>
    ),
    sub: "Every run of the year, recapped into one shareable artifact.",
    capture: "captures/rs-6-year.png",
    screen: <YearScreen {...s} />,
  },
];

export const SHOTS: Record<string, Shot> = Object.fromEntries(SHOT_LIST.map((shot) => [shot.id, shot]));
