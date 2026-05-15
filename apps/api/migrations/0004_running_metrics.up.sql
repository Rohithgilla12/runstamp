-- HealthKit ingest v2 — read EVERYTHING running-related, not just the minimal
-- distance/duration/HR set from migration 0003.
--
-- Apple Watch records seven running-specific quantity types (running power,
-- vertical oscillation, ground contact time, stride length, running speed,
-- cadence, VO2 max) plus an HKWorkoutEvent stream of lap markers we use as
-- splits. This migration:
--   1. Adds per-workout aggregate columns to `activities`.
--   2. Adds a `splits` JSONB column for the lap breakdown.
--   3. Expands `activity_streams.type` to allow the new stream kinds we
--      down-sample from Apple Watch's per-second samples.

ALTER TABLE activities
  ADD COLUMN cadence_spm                 numeric(6, 2),
  ADD COLUMN running_power_w             numeric(6, 1),
  ADD COLUMN vertical_oscillation_cm     numeric(5, 2),
  ADD COLUMN ground_contact_ms           numeric(6, 1),
  ADD COLUMN stride_length_m             numeric(5, 3),
  ADD COLUMN vo2max_ml_kg_min            numeric(5, 2),
  ADD COLUMN avg_speed_m_s               numeric(6, 3),
  -- splits is an array of objects shaped:
  --   { km: int, durationSec: int, avgHr?: int, avgPace?: int, distanceM: number }
  -- Stored as JSONB so the editor / activity detail can render rows without
  -- a join, and so we don't need a third table just for splits.
  ADD COLUMN splits                      jsonb;

-- Widen the stream-type whitelist to include the running-specific kinds.
-- Per the Kingstinct + HealthKit identifiers; values are the canonical short
-- names we use both client- and server-side.
ALTER TABLE activity_streams
  DROP CONSTRAINT activity_streams_type_check;

ALTER TABLE activity_streams
  ADD CONSTRAINT activity_streams_type_check CHECK (type IN (
    'latlng',
    'heartrate',
    'altitude',
    'velocity',
    'cadence',
    'power',
    'vertical_oscillation',
    'ground_contact_time',
    'stride_length',
    'speed'
  ));
