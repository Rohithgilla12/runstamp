-- Grade-Adjusted Pace per activity, computed from altitude + velocity
-- streams via Minetti's energetic-cost polynomial (J Appl Physiol 2002).
-- Denormalised onto the activity row so list views don't replay the
-- per-second math on every request.
ALTER TABLE activities
  ADD COLUMN gap_seconds_per_km numeric(7, 2) NULL;
