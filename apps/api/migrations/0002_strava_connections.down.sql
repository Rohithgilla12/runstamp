DROP TABLE IF EXISTS strava_connections;

-- Restore the original polymorphic table from 0001 so a down → up cycle is a no-op.
CREATE TABLE connected_accounts (
  user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider                 text NOT NULL CHECK (provider IN ('strava','apple_health','health_connect')),
  external_id              text NOT NULL,
  access_token_encrypted   bytea NOT NULL,
  refresh_token_encrypted  bytea NOT NULL,
  expires_at               timestamptz NOT NULL,
  scopes                   text[] NOT NULL DEFAULT '{}',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX idx_connected_accounts_user_id ON connected_accounts (user_id);
