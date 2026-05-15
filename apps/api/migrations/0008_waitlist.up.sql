-- 0008_waitlist.up.sql
-- Marketing waitlist capture. citext gives us case-insensitive UNIQUE
-- enforcement without an application-level toLower call.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE waitlist_signups (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       citext      NOT NULL UNIQUE,
    source      text,
    ip_hash     text,
    user_agent  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_created_at ON waitlist_signups (created_at DESC);
