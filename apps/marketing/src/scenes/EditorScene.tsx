// EditorScene v2 — show the actual editor UI inside a phone frame.
// Composition: phone holds the share-card canvas (a Postage card), a strip of
// template thumbnails at the bottom, and a draggable stat sticker that
// glides into place. The headline copy sits beside the phone (landscape) or
// above it (portrait).

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import { PhoneFrame } from "../components/PhoneFrame";
import { PostageCard } from "../components/PostageCard";
import type { LaunchVideoProps } from "../LaunchVideo";

const sample = {
  country: "JAPAN",
  city: "Tokyo",
  distance: "21.1",
  pace: "5:12/km",
  time: "1:49:43",
  runNo: "A0009",
  date: "2026 · JAN · 22",
};

// Six template thumbnails to scroll across the bottom strip.
const templates = ["Postage", "Postmark", "Boarding", "Passport", "Customs", "Wax Seal"];

export const EditorScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = orientation === "portrait";

  // Heading slides in immediately
  const headEnter = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });

  // Phone slides up from below
  const phoneEnter = spring({ frame: Math.max(0, frame - 6), fps, config: { damping: 20, mass: 0.7 } });

  // Sticker drag — appears at the right edge below the card, then glides up
  // and toward the centre of the canvas over frames 70→120.
  const stickerEnter = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const stickerDragProgress = interpolate(frame, [70, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Template picker — highlight cycles through templates
  const pickerHighlight = Math.floor(interpolate(frame, [80, 170], [0, templates.length - 1], { extrapolateRight: "clamp" }));

  // Phone size — bigger on portrait, side-by-side on landscape
  const phoneW = portrait ? 720 : 600;
  const phoneH = portrait ? 1280 : 1120;

  // Canvas area inside phone — the share card sits here at scale to fit
  const cardScale = portrait ? 1.95 : 1.65;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: portrait ? "column" : "row",
          alignItems: "center",
          justifyContent: portrait ? "flex-start" : "center",
          paddingTop: portrait ? 110 : 0,
          paddingInline: portrait ? 60 : 100,
          gap: portrait ? 28 : 80,
        }}
      >
        {/* Headline */}
        <div
          style={{
            opacity: headEnter,
            transform: `translateY(${(1 - headEnter) * -16}px)`,
            textAlign: portrait ? "center" : "left",
            maxWidth: portrait ? 980 : 640,
          }}
        >
          <Eyebrow color={colors.accent} size={portrait ? 22 : 20} style={{ marginBottom: 16 }}>Editor</Eyebrow>
          <div style={{ fontFamily: fonts.serifItalic, fontSize: portrait ? 88 : 96, fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
            Every run, <br />a <span style={{ color: colors.accent }}>keepsake</span>.
          </div>
          <div style={{ fontFamily: fonts.ui, fontSize: portrait ? 28 : 26, color: colors.ink3, marginTop: 18, lineHeight: 1.4 }}>
            Twelve templates · drag stickers · drop a photo · export.
          </div>
        </div>

        {/* Phone with editor */}
        <div
          style={{
            transform: `translateY(${(1 - phoneEnter) * 80}px) scale(${0.92 + phoneEnter * 0.08})`,
            opacity: phoneEnter,
          }}
        >
          <PhoneFrame width={phoneW} height={phoneH}>
            {/* Editor header */}
            <div
              style={{
                position: "absolute",
                top: 38,
                left: 16,
                right: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 5,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.ink3, letterSpacing: "0.14em" }}>← BACK</span>
              <span style={{ fontFamily: fonts.serifItalic, fontSize: 18, color: colors.ink }}>Editor</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.accent, letterSpacing: "0.14em" }}>EXPORT</span>
            </div>

            {/* Card canvas */}
            <div
              style={{
                position: "absolute",
                top: portrait ? 90 : 80,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div style={{ transform: `scale(${cardScale * 0.92})`, transformOrigin: "top center" }}>
                <PostageCard {...sample} />
              </div>
            </div>

            {/* Floating sticker. Starts at the right edge below the card and
                glides toward the bottom-right of the share canvas as the
                user "drags" it. */}
            <div
              style={{
                position: "absolute",
                top: (portrait ? 700 : 580) - stickerDragProgress * (portrait ? 280 : 240),
                right: 24 + stickerDragProgress * (phoneW * 0.30),
                transform: `scale(${stickerEnter})`,
                opacity: stickerEnter,
                zIndex: 6,
              }}
            >
              <StatSticker label="AVG HR" value="152" sub="BPM" />
            </div>

            {/* Template picker at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 28,
                left: 0,
                right: 0,
                display: "flex",
                gap: 8,
                paddingInline: 16,
                overflow: "hidden",
              }}
            >
              {templates.map((t, i) => {
                const active = i === pickerHighlight;
                return (
                  <div
                    key={t}
                    style={{
                      flex: "0 0 auto",
                      width: portrait ? 120 : 100,
                      height: portrait ? 150 : 130,
                      borderRadius: 10,
                      backgroundColor: active ? colors.ink : colors.paper2,
                      border: `1px solid ${active ? colors.ink : colors.line}`,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      padding: 8,
                      transition: "background 200ms",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        color: active ? colors.paper : colors.ink3,
                      }}
                    >
                      {t.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const StatSticker: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div
    style={{
      backgroundColor: colors.paper2,
      border: `1px solid ${colors.ink}`,
      borderRadius: 12,
      padding: "10px 16px",
      minWidth: 110,
      textAlign: "center",
      boxShadow: "0 8px 22px rgba(20,17,13,0.18)",
    }}
  >
    <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: "0.16em", color: colors.ink3 }}>{label}</div>
    <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 28, letterSpacing: "-0.04em", color: colors.ink, lineHeight: 1 }}>{value}</div>
    <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: "0.16em", color: colors.ink3 }}>{sub}</div>
  </div>
);
