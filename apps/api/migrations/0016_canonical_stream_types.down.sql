-- Restore 'velocity' in the CHECK constraint. We don't rename rows back —
-- there's no way to know which 'speed' rows came from Strava without a
-- source join, and going forward all writers use 'speed'. The constraint
-- restoration is enough to make older code that emits 'velocity' valid again.

ALTER TABLE activity_streams DROP CONSTRAINT activity_streams_type_check;

ALTER TABLE activity_streams
  ADD CONSTRAINT activity_streams_type_check CHECK (type IN (
    'latlng',
    'heartrate',
    'altitude',
    'velocity',
    'speed',
    'cadence',
    'power',
    'vertical_oscillation',
    'ground_contact_time',
    'stride_length'
  ));
