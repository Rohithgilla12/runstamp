ALTER TABLE stamp_definitions
  DROP CONSTRAINT stamp_definitions_category_check;

ALTER TABLE stamp_definitions
  ADD CONSTRAINT stamp_definitions_category_check
  CHECK (category IN ('distance', 'pace', 'streak', 'place', 'milestone'));
