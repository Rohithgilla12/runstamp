-- Strava deep import — fetch ALL historical activities (not just 90 days).
--
-- The user has 500+ activities. At Strava's 100 req / 15 min per-athlete
-- budget that's ~26 hours of background work (3 list calls + 1000 detail-
-- and-stream calls). We do it in two phases:
--
--   Phase 1 (listing)    — pull every page of /athlete/activities and INSERT
--                          minimal-shape rows. ~5 seconds for 500 activities.
--                          activities.has_detail stays false.
--   Phase 2 (enriching)  — walk `activities WHERE has_detail=false` and pull
--                          the rich detail + streams. Rate-limit-header
--                          aware: sleeps until the next 15-min boundary
--                          when usage gets near 90/100, and until UTC
--                          midnight when daily usage nears 950/1000.
--
-- Progress is durable: a `strava_imports` row per user, updated after every
-- activity. Server restart resumes from the last unenriched row.
--
-- Webhook ingest (separate path, already shipped) flips has_detail=true on
-- the fly when Strava pushes a new run.

ALTER TABLE activities
  ADD COLUMN has_detail   boolean NOT NULL DEFAULT false,
  ADD COLUMN has_streams  boolean NOT NULL DEFAULT false;

-- Partial index so the worker's "next activity to enrich" query is cheap
-- regardless of how many activities the user has.
CREATE INDEX idx_activities_strava_needs_detail
  ON activities (user_id, started_at DESC)
  WHERE source = 'strava' AND has_detail = false;

CREATE TABLE strava_imports (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status             text NOT NULL CHECK (status IN ('pending','listing','enriching','paused','complete','error')),
  summary_count      integer NOT NULL DEFAULT 0,
  detail_fetched     integer NOT NULL DEFAULT 0,
  detail_total       integer NOT NULL DEFAULT 0,
  -- When the worker is sleeping for a Strava rate-limit window, this is
  -- the wall-clock time it intends to wake up. Lets `/status` show an ETA
  -- and lets a fresh boot know it can pick up an `enriching` row again.
  rate_window_until  timestamptz,
  last_error         text,
  started_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);
CREATE INDEX idx_strava_imports_status_updated
  ON strava_imports (status, updated_at)
  WHERE status IN ('listing', 'enriching');
