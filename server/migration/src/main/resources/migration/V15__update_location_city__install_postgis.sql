-- ONLY FOR SUPERUSERS
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE location ADD COLUMN location_point geography(POINT, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

CREATE INDEX IF NOT EXISTS idx_location_location_point ON location USING GIST (location_point);

