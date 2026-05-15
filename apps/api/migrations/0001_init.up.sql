-- 0001_init.up.sql
-- Initial schema for Runstamp v0.1: users and connected OAuth accounts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid  text        UNIQUE,
    email         text,
    display_name  text,
    home_city     text,
    units         text        NOT NULL DEFAULT 'metric'
                              CHECK (units IN ('metric', 'imperial')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connected_accounts (
    user_id                 uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider                text        NOT NULL
                                        CHECK (provider IN ('strava', 'apple_health', 'health_connect')),
    external_id             text        NOT NULL,
    access_token_encrypted  bytea       NOT NULL,
    refresh_token_encrypted bytea       NOT NULL,
    expires_at              timestamptz NOT NULL,
    scopes                  text[]      NOT NULL DEFAULT '{}',
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT connected_accounts_provider_external_id_key UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts (user_id);
