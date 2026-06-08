import { Composition } from "remotion";
import { LaunchVideo, launchVideoSchema } from "./LaunchVideo";
import { VIDEO_DURATION_FRAMES, VIDEO_FPS } from "./theme";
import { AppStoreShot, appStoreShotSchema } from "./appstore/AppStoreShot";
import { SHOT_LIST } from "./appstore/shots";
import { SHOT_W, SHOT_H } from "./appstore/layout";

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

      {/* App Store screenshots — 6.9" iPhone (1320×2868), one still per shot. */}
      {SHOT_LIST.map((shot) => (
        <Composition
          key={shot.id}
          id={`AppStore-${shot.id}`}
          component={AppStoreShot}
          durationInFrames={1}
          fps={VIDEO_FPS}
          width={SHOT_W}
          height={SHOT_H}
          schema={appStoreShotSchema}
          defaultProps={{ id: shot.id }}
        />
      ))}
    </>
  );
};
