-- Stamps engine (PRD §6.6).
--
-- Two tables:
--   stamp_definitions — the catalog. Seeded from code at app boot (not editable
--   by users). One row per earnable stamp, with a machine-checkable `criteria`
--   JSON the evaluator interprets.
--   stamps_earned     — one row per (user, stamp) award. Each stamp earned at
--   most once per user (UNIQUE constraint). Linked to the activity that
--   triggered it when applicable so the share-card flow can pull a route map.

CREATE TABLE stamp_definitions (
  id            text PRIMARY KEY,            -- e.g. 'first_marathon'
  name          text NOT NULL,               -- 'First marathon'
  description   text NOT NULL,
  tier          text NOT NULL CHECK (tier IN ('common', 'rare', 'mythic')),
  category      text NOT NULL CHECK (category IN ('distance', 'pace', 'streak', 'place', 'milestone')),
  -- Machine-checkable rule. The evaluator switches on `kind` and reads the
  -- remaining keys.
  --
  --   { "kind": "single_activity",
  --     "sport": "run",
  --     "distance_m_gte": 42195,
  --     "time_seconds_lte": 13500 }
  --
  --   { "kind": "cumulative_distance",
  --     "distance_m_gte": 1000000,
  --     "window": "all_time" | "year" | "month" }
  --
  --   { "kind": "cities_count",
  --     "cities_gte": 5 }
  --
  -- Other kinds added as we grow.
  criteria      jsonb NOT NULL,
  released_at   timestamptz NOT NULL DEFAULT now(),
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_stamp_definitions_tier ON stamp_definitions (tier, sort_order);

CREATE TABLE stamps_earned (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stamp_id      text NOT NULL REFERENCES stamp_definitions(id) ON DELETE CASCADE,
  earned_at     timestamptz NOT NULL DEFAULT now(),
  activity_id   uuid REFERENCES activities(id) ON DELETE SET NULL,
  context       jsonb,                       -- e.g. { "actual_time_seconds": 13613 }
  UNIQUE (user_id, stamp_id)
);

CREATE INDEX idx_stamps_earned_user ON stamps_earned (user_id, earned_at DESC);
