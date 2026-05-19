-- Default share surface (aspect ratio) for the editor. NULL = use the
-- client default (currently '9:16'). Allowed values: '9:16' | '1:1' | '4:5'.
-- We don't enforce a CHECK constraint at the DB level because the set is
-- small and the validation lives in the API handler where we can give a
-- proper 400 response instead of a Postgres 23514 leak.
ALTER TABLE users
  ADD COLUMN ui_default_surface text NULL;
