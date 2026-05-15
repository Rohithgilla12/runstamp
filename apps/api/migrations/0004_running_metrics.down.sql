ALTER TABLE activity_streams DROP CONSTRAINT activity_streams_type_check;
ALTER TABLE activity_streams ADD CONSTRAINT activity_streams_type_check CHECK (type IN (
  'latlng', 'heartrate', 'altitude', 'velocity', 'cadence'
));

ALTER TABLE activities
  DROP COLUMN cadence_spm,
  DROP COLUMN running_power_w,
  DROP COLUMN vertical_oscillation_cm,
  DROP COLUMN ground_contact_ms,
  DROP COLUMN stride_length_m,
  DROP COLUMN vo2max_ml_kg_min,
  DROP COLUMN avg_speed_m_s,
  DROP COLUMN splits;
