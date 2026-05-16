-- Add 'event' to the allowed stamp_definitions.category values for the
-- regional flagship batch (Tata Mumbai Marathon etc). See
-- docs/design/stamp-catalog-expansion.md for the catalog rationale.

ALTER TABLE stamp_definitions
  DROP CONSTRAINT stamp_definitions_category_check;

ALTER TABLE stamp_definitions
  ADD CONSTRAINT stamp_definitions_category_check
  CHECK (category IN ('distance', 'pace', 'streak', 'place', 'milestone', 'event'));
