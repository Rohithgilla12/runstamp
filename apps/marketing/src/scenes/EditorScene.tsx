import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import { PostageCard } from "../components/PostageCard";
import type { LaunchVideoProps } from "../LaunchVideo";

// Three sample runs the card cycles through. Each lingers ~60 frames (2s).
const samples = [
  { country: "JAPAN",   city: "Tokyo",     distance: "21.1", pace: "5:12/km", time: "1:49:43", runNo: "A0009", date: "2026 · JAN · 22" },
  { country: "ICELAND", city: "Reykjavík", distance: "16.4", pace: "5:48/km", time: "1:35:11", runNo: "M0003", date: "2026 · MAY · 08" },
  { country: "INDIA",   city: "Hyderabad", distance: "32.0", pace: "4:58/km", time: "2:39:14", runNo: "A0001", date: "2026 · MAR · 02" },
];

export const EditorScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portraitLayout = orientation === "portrait";

  // Pick the active sample by elapsed frame; cards cross-fade.
  const cycleFrames = 60;
  const activeIdx = Math.min(samples.length - 1, Math.floor(frame / cycleFrames));
  const local = frame % cycleFrames;
  const flipProgress = interpolate(local, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const enter = spring({ frame: local, fps, config: { damping: 14, mass: 0.4 } });

  // Subtle drift on the card
  const drift = interpolate(frame, [0, 180], [-8, 8]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      {/* Top eyebrow + caption */}
      <div style={{ position: "absolute", top: portraitLayout ? 110 : 80, left: 80, right: 80, textAlign: portraitLayout ? "center" : "left" }}>
        <Eyebrow color={colors.accent} size={22} style={{ marginBottom: 18 }}>Editor</Eyebrow>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: portraitLayout ? 88 : 104, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          Every run, a <span style={{ color: colors.accent }}>keepsake</span>.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portraitLayout ? 34 : 30, color: colors.ink3, marginTop: 18, maxWidth: portraitLayout ? 820 : 760 }}>
          Twelve templates. Drop a photo. Drag the stat stickers. Export.
        </div>
      </div>

      {/* Stack of cards — current visible, fading between samples */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: portraitLayout ? 420 : 80,
          paddingBottom: portraitLayout ? 140 : 80,
        }}
      >
        <div style={{ position: "relative", transform: `translateY(${drift}px)` }}>
          <div style={{ opacity: 1 - flipProgress, transform: `scale(${1 - flipProgress * 0.04}) rotate(${-flipProgress * 2}deg)`, position: "absolute", inset: 0 }}>
            {activeIdx > 0 && <PostageCard {...samples[activeIdx - 1]} scale={portraitLayout ? 2.4 : 2.0} />}
          </div>
          <div style={{ opacity: flipProgress * enter, transform: `scale(${0.92 + enter * 0.08})` }}>
            <PostageCard {...samples[activeIdx]} scale={portraitLayout ? 2.4 : 2.0} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
