-- Geocode cache: persistent cache for (lat, lon) → (city, country) lookups.
--
-- Nominatim's usage policy caps us at 1 req/sec and asks that we cache
-- aggressively. PRD §5 calls for caching per ~1km grid cell forever.
-- Implementation: we quantize coords to 0.01 degrees (~1.1km at the equator)
-- and use that as the primary key.

CREATE TABLE geocode_cache (
  lat_cell    integer NOT NULL,  -- floor(lat * 100)
  lon_cell    integer NOT NULL,  -- floor(lon * 100)
  city        text,
  country     text,
  country_code text,
  cached_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lat_cell, lon_cell)
);
