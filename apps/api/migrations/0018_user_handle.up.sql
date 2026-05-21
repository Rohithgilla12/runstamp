-- Public profile fields: handle (the URL slug at runstamp.app/u/<handle>)
-- and profile_public (opt-in switch). Both default to NULL / false so
-- existing users have no public surface until they explicitly claim a
-- handle + toggle public.
--
-- handle is case-folded to lowercase by the API; the unique constraint
-- enforces global uniqueness. Reserved words (api, admin, settings, etc.)
-- are enforced in the handler, not the schema — easier to evolve.
--
-- Constraint name kept short so future migrations can reference it.
ALTER TABLE users
  ADD COLUMN handle         text    NULL,
  ADD COLUMN profile_public boolean NOT NULL DEFAULT false;

-- Partial unique index so we can have many NULL handles (= unclaimed)
-- but each claimed handle is unique. lower() makes the uniqueness
-- case-insensitive so "Gilla" can't be claimed alongside "gilla".
CREATE UNIQUE INDEX idx_users_handle_unique
  ON users (lower(handle))
  WHERE handle IS NOT NULL;

-- Lookup index for the public-profile endpoint.
CREATE INDEX idx_users_handle_public
  ON users (lower(handle))
  WHERE profile_public = true;
