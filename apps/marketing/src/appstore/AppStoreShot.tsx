// App Store still — paper canvas with a marketing headline over the app screen.
// Two layouts: full-bleed (a real simulator capture, no device frame) when the
// shot has `capture`, else a designed screen inside a phone frame. One still per
// shot, rendered to 1320×2868 via `remotion still`. The `id` prop is a plain
// string (serialisable across the CLI boundary); the shot's JSX lives in SHOTS.

import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import { PhoneFrame } from "../components/PhoneFrame";
import { Grain } from "../components/Grain";
import { SHOTS, type Shot } from "./shots";
import { PHONE_W, PHONE_H, SHOT_W, SHOT_H } from "./layout";

export const appStoreShotSchema = z.object({ id: z.string() });

// Shared headline block — eyebrow + Instrument-Serif headline + Geist subhead.
const Headline: React.FC<{ shot: Shot }> = ({ shot }) => (
  <div style={{ position: "absolute", top: 130, left: 96, right: 96, textAlign: "center" }}>
    <Eyebrow color={colors.accent} size={28} style={{ display: "block", marginBottom: 26 }}>
      {shot.eyebrow}
    </Eyebrow>
    <div style={{ fontFamily: fonts.serifItalic, fontSize: 110, fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
      {shot.headline}
    </div>
    <div style={{ fontFamily: fonts.ui, fontSize: 36, color: colors.ink3, marginTop: 26, lineHeight: 1.35, maxWidth: 1000, marginInline: "auto" }}>
      {shot.sub}
    </div>
  </div>
);

// Capture is rendered at native 6.9" aspect (1320×2868), fitted into the area
// below the headline — full screen visible, nothing cropped.
const CAP_ASPECT = SHOT_W / SHOT_H;
const BOX_TOP = 600;
const BOX_BOTTOM_MARGIN = 70;
const BOX_SIDE_MARGIN = 70;

const FullBleed: React.FC<{ shot: Shot }> = ({ shot }) => {
  const boxW = SHOT_W - BOX_SIDE_MARGIN * 2;
  const boxH = SHOT_H - BOX_TOP - BOX_BOTTOM_MARGIN;
  let w = boxH * CAP_ASPECT;
  let h = boxH;
  if (w > boxW) {
    w = boxW;
    h = boxW / CAP_ASPECT;
  }
  return (
    <>
      <Headline shot={shot} />
      <div style={{ position: "absolute", top: BOX_TOP, left: 0, right: 0, height: boxH, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <Img
          src={staticFile(shot.capture as string)}
          style={{
            width: w,
            height: h,
            objectFit: "cover",
            borderRadius: 56,
            boxShadow: "0 30px 80px rgba(20,17,13,0.28), 0 6px 24px rgba(20,17,13,0.16)",
          }}
        />
      </div>
    </>
  );
};

const Framed: React.FC<{ shot: Shot }> = ({ shot }) => (
  <>
    <Headline shot={shot} />
    <div style={{ position: "absolute", top: SHOT_H - PHONE_H - 40, left: "50%", transform: "translateX(-50%)" }}>
      <PhoneFrame width={PHONE_W} height={PHONE_H}>{shot.screen}</PhoneFrame>
    </div>
  </>
);

export const AppStoreShot: React.FC<z.infer<typeof appStoreShotSchema>> = ({ id }) => {
  const shot = SHOTS[id];
  if (!shot) throw new Error(`Unknown App Store shot: ${id}`);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper, overflow: "hidden" }}>
      {shot.capture ? <FullBleed shot={shot} /> : <Framed shot={shot} />}

      {/* Paper grain — the philately aesthetic depends on it. */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Grain />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
