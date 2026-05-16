import { Composition } from "remotion";
import { LaunchVideo, launchVideoSchema } from "./LaunchVideo";
import { VIDEO_DURATION_FRAMES, VIDEO_FPS } from "./theme";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="LaunchStory"
        component={LaunchVideo}
        durationInFrames={VIDEO_DURATION_FRAMES}
        fps={VIDEO_FPS}
        width={1080}
        height={1920}
        schema={launchVideoSchema}
        defaultProps={{ orientation: "portrait" as const }}
      />
      <Composition
        id="LaunchPost"
        component={LaunchVideo}
        durationInFrames={VIDEO_DURATION_FRAMES}
        fps={VIDEO_FPS}
        width={1920}
        height={1080}
        schema={launchVideoSchema}
        defaultProps={{ orientation: "landscape" as const }}
      />
    </>
  );
};
