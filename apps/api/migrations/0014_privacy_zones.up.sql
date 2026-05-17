-- Privacy zones — circular regions per user that mask the route polyline
-- (and the activity's denormalised start point) at render time. Default
-- radius is 200m, the same shape Strava uses for hide-home/work. lat/lng
-- stored as double precision (not geography) because we don't need PostGIS
-- distance queries here — the masking happens client-side at SVG render
-- time and the per-user count is small (1-5 zones typical).
CREATE TABLE privacy_zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Optional human label ("Home", "Office"). Not user-facing in v1, but
  -- saved so a future UI can show them in the list.
  name       text NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  -- Hard cap of 1km — beyond that you're not blurring a start, you're
  -- hiding entire runs. Cap matches Strava's max.
  radius_m   integer NOT NULL CHECK (radius_m BETWEEN 50 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_privacy_zones_user_id ON privacy_zones (user_id);
