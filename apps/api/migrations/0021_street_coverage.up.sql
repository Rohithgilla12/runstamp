-- Self-hosted OSM street network + per-activity street coverage (#1-B).
CREATE TABLE osm_ways (
  way_id   bigint PRIMARY KEY,
  highway  text NOT NULL,
  name     text,
  geom     geography(LINESTRING, 4326) NOT NULL,
  length_m double precision NOT NULL
);
CREATE INDEX idx_osm_ways_geom ON osm_ways USING GIST (geom);

-- Imported bboxes, so we never re-import a covered region.
CREATE TABLE osm_regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bbox        geography(POLYGON, 4326) NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_osm_regions_bbox ON osm_regions USING GIST (bbox);

-- Which runnable ways an activity ran along.
CREATE TABLE activity_covered_ways (
  activity_id uuid   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  way_id      bigint NOT NULL,
  PRIMARY KEY (activity_id, way_id)
);
CREATE INDEX idx_acw_way ON activity_covered_ways (way_id);
