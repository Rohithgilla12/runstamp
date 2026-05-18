-- UI preferences denormalised onto users — tile style picker, dark mode,
-- accent, onboarding completion. All nullable: NULL means "use the client
-- default" so existing users don't get forced into a setting they never
-- chose. units already lives on users from M0; we leave it there and start
-- hydrating mobile AppState.units from it as part of this work.
ALTER TABLE users
  ADD COLUMN ui_dark       boolean NULL,
  ADD COLUMN ui_accent     text    NULL,
  ADD COLUMN ui_tile_style text    NULL,
  ADD COLUMN ui_onboarded  boolean NULL;
