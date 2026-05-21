DROP INDEX IF EXISTS idx_users_handle_public;
DROP INDEX IF EXISTS idx_users_handle_unique;
ALTER TABLE users
  DROP COLUMN IF EXISTS profile_public,
  DROP COLUMN IF EXISTS handle;
