-- Strava integration v1 (cadence-style).
--
-- The polymorphic connected_accounts table from migration 0001 conflated
-- "OAuth-token storage" with "data sources" — but the actual data sources
-- vary (Strava is OAuth; Apple Health / Health Connect aren't OAuth at all).
-- This migration drops connected_accounts and introduces a Strava-specific
-- table that can carry athlete metadata, refresh state, and scopes cleanly.
--
-- Per cadence's disconnect contract: rows here are HARD-deleted on disconnect
-- (no soft-delete) so encrypted tokens never linger on disk. Ingested
-- activities (a future strava_activities table) stay unless the user also
-- clears them.

DROP TABLE IF EXISTS connected_accounts;

CREATE TABLE strava_connections (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  athlete_id           bigint NOT NULL,
  -- Tokens are base64(<12-byte nonce> || <ciphertext>), AES-256-GCM.
  -- Encryption key is the existing RUNSTAMP_TOKEN_ENC_KEY (see config).
  access_token_enc     text NOT NULL,
  refresh_token_enc    text NOT NULL,
  expires_at           timestamptz NOT NULL,
  scope                text NOT NULL DEFAULT 'activity:read',
  -- Athlete summary captured at connect time. Read-only display fields;
  -- not refreshed on every sync. Source of truth is Strava.
  athlete_firstname    text,
  athlete_lastname     text,
  athlete_profile_url  text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  refreshed_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strava_connections_athlete_id ON strava_connections (athlete_id);
