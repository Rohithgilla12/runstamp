-- Activities — the source-agnostic table for ingested runs.
--
-- One row per unique (user_id, source, external_id) tuple. Strava and Apple
-- Health both feed the same table; the `source` column tells them apart.
--
-- Dedup contract (PRD §6.8): when a run arrives that matches an existing run
-- by `started_at` (±60s) and `distance_m` (±2%) for the same user, we KEEP
-- both rows but stamp `dupe_of` on the newer one pointing at the canonical
-- one. The dedup helper in internal/activities prefers strava as canonical
-- when both sources race in.

CREATE TABLE activities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source             text NOT NULL CHECK (source IN ('strava', 'apple_health', 'manual')),
  external_id        text NOT NULL,
  sport              text NOT NULL DEFAULT 'run',
  started_at         timestamptz NOT NULL,
  elapsed_seconds    integer NOT NULL,
  moving_seconds     integer,
  distance_m         numeric(10, 2) NOT NULL,
  elevation_gain_m   numeric(8, 2),
  avg_hr             integer,
  max_hr             integer,
  avg_pace_s_per_km  numeric(8, 2),
  calories           integer,
  title              text,
  notes              text,
  -- Geographic start as PostGIS point (SRID 4326 = WGS84). Used for the
  -- Places feature's reverse geocoding pipeline.
  location_start     geography(POINT, 4326),
  location_city      text,
  location_country   text,
  -- Original payload for re-ingest if the parser changes. Strava's full
  -- detailed-activity response or HK's HKWorkout dict.
  raw                jsonb,
  -- When non-null this row is a duplicate of `dupe_of`. Canonical row is
  -- whichever was inserted first OR whichever source we prefer per the
  -- conflict-resolution rule (Strava wins when both arrive).
  dupe_of            uuid REFERENCES activities(id) ON DELETE SET NULL,
  ingested_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, external_id)
);

CREATE INDEX idx_activities_user_started     ON activities (user_id, started_at DESC);
CREATE INDEX idx_activities_user_source      ON activities (user_id, source);
CREATE INDEX idx_activities_user_canonical   ON activities (user_id, started_at DESC) WHERE dupe_of IS NULL;
CREATE INDEX idx_activities_location_start   ON activities USING GIST (location_start);

-- Streams — downsampled per-activity time series (HR, pace, altitude, latlng).
-- Full streams stay on R2 (per PRD §5); this table holds the ~500-point
-- downsample the editor + charts read.
CREATE TABLE activity_streams (
  activity_id  uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('latlng', 'heartrate', 'altitude', 'velocity', 'cadence')),
  data         jsonb NOT NULL,
  PRIMARY KEY (activity_id, type)
);
