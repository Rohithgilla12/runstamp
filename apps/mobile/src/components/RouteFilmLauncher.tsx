// Entry point for the route flythrough film. Fetches the run's privacy-masked
// GPS, precomputes the projected polyline + fit transform ONCE, and opens the
// existing VideoExportModal. Renders nothing if the run has no usable GPS.

import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import {
  bboxOf,
  cumulativeLengths,
  fitTransform,
  projectRoute,
} from '../analytics/routeFilmCamera';
import { RouteFilmFrame } from '../design/RouteFilmFrame';
import { VideoExportModal } from '../screens/share/VideoExportModal';
import { shareExportedVideo } from '../services/videoExport';
import { TText } from '../design/typography';
import { useColors } from '../design/theme';
import type { Activity } from '../data/models';

const FILM_W = 1080;
const FILM_H = 1920; // 9:16, even dims (H.264 requirement)
const MIN_POINTS = 10;

export function RouteFilmLauncher({
  run,
  rawLatLng,
}: {
  run: Activity;
  rawLatLng: Array<readonly [number, number]> | null;
}) {
  const c = useColors();
  const [filming, setFilming] = useState(false);

  const film = useMemo(() => {
    if (!rawLatLng || rawLatLng.length < MIN_POINTS) return null;
    const points = projectRoute(rawLatLng);
    if (points.length < 2) return null;
    const cum = cumulativeLengths(points);
    const fit = fitTransform(bboxOf(points), FILM_W, FILM_H);
    return { points, cum, fit };
  }, [rawLatLng]);

  if (!film) return null; // no GPS (e.g. treadmill) → no flythrough action

  return (
    <>
      <Pressable
        onPress={() => setFilming(true)}
        style={{
          paddingVertical: 11,
          paddingHorizontal: 16,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.paper2,
          alignItems: 'center',
        }}
      >
        <TText style={{ color: c.ink, fontSize: 13, fontWeight: '500' }}>Flythrough film</TText>
      </Pressable>

      <VideoExportModal
        visible={filming}
        dims={{ width: FILM_W, height: FILM_H }}
        fps={30}
        durationSec={8}
        renderFrame={(p) => (
          <RouteFilmFrame
            progress={p}
            points={film.points}
            cum={film.cum}
            fit={film.fit}
            totalKm={run.distance}
            title={run.title}
            place={run.place}
            width={FILM_W}
            height={FILM_H}
          />
        )}
        onCancel={() => setFilming(false)}
        onComplete={async (uri) => {
          setFilming(false);
          await shareExportedVideo(uri, `${run.title} — a Runstamp flythrough`);
        }}
      />
    </>
  );
}
