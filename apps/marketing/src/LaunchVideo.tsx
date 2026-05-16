import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { colors, SCENES } from "./theme";
import { TitleScene } from "./scenes/TitleScene";
import { EditorScene } from "./scenes/EditorScene";
import { AnalyticsScene } from "./scenes/AnalyticsScene";
import { PassportScene } from "./scenes/PassportScene";
import { StampsScene } from "./scenes/StampsScene";
import { OutroScene } from "./scenes/OutroScene";
import { Grain } from "./components/Grain";

export const launchVideoSchema = z.object({
  orientation: z.enum(["portrait", "landscape"]),
});

export type LaunchVideoProps = z.infer<typeof launchVideoSchema>;

export const LaunchVideo: React.FC<LaunchVideoProps> = ({ orientation }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper, overflow: "hidden" }}>
      <Sequence from={SCENES.title.start} durationInFrames={SCENES.title.length}>
        <TitleScene orientation={orientation} />
      </Sequence>
      <Sequence from={SCENES.editor.start} durationInFrames={SCENES.editor.length}>
        <EditorScene orientation={orientation} />
      </Sequence>
      <Sequence from={SCENES.analytics.start} durationInFrames={SCENES.analytics.length}>
        <AnalyticsScene orientation={orientation} />
      </Sequence>
      <Sequence from={SCENES.passport.start} durationInFrames={SCENES.passport.length}>
        <PassportScene orientation={orientation} />
      </Sequence>
      <Sequence from={SCENES.stamps.start} durationInFrames={SCENES.stamps.length}>
        <StampsScene orientation={orientation} />
      </Sequence>
      <Sequence from={SCENES.outro.start} durationInFrames={SCENES.outro.length}>
        <OutroScene orientation={orientation} />
      </Sequence>
      {/* Paper grain over everything — the philately aesthetic depends on it. */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Grain />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
