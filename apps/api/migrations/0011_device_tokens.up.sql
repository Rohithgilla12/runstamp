CREATE TABLE device_tokens (
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token        text NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, token)
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens (user_id);
