-- Per-activity segment best efforts: the fastest contiguous segment covering
-- each PR distance, computed at ingest from distance+time streams.
CREATE TABLE activity_best_efforts (
  activity_id   uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  distance_m    int  NOT NULL,
  time_seconds  int  NOT NULL,
  PRIMARY KEY (activity_id, distance_m)
);

-- Aggregate query is MIN(time_seconds) per distance across a user's activities.
CREATE INDEX idx_abe_distance_time ON activity_best_efforts (distance_m, time_seconds);
