-- Canonicalise the running-speed stream name.
--
-- We had two names for the same physical quantity in m/s:
--   - 'velocity' (Strava, from velocity_smooth — a misnomer; it's a scalar)
--   - 'speed'    (Apple Health, from HKQuantityTypeIdentifierRunningSpeed)
--
-- Both client and server now standardise on 'speed'. Strava ingest writes
-- 'speed' (was 'velocity'); mobile reads streams.speed in ActivityScreen +
-- EditorScreen. This migration converts any existing 'velocity' rows and
-- drops 'velocity' from the CHECK constraint.

UPDATE activity_streams SET type = 'speed' WHERE type = 'velocity';

ALTER TABLE activity_streams DROP CONSTRAINT activity_streams_type_check;

ALTER TABLE activity_streams
  ADD CONSTRAINT activity_streams_type_check CHECK (type IN (
    'latlng',
    'heartrate',
    'altitude',
    'speed',
    'cadence',
    'power',
    'vertical_oscillation',
    'ground_contact_time',
    'stride_length'
  ));
