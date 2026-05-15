DROP INDEX IF EXISTS idx_strava_imports_status_updated;
DROP TABLE IF EXISTS strava_imports;
DROP INDEX IF EXISTS idx_activities_strava_needs_detail;
ALTER TABLE activities
  DROP COLUMN has_detail,
  DROP COLUMN has_streams;
