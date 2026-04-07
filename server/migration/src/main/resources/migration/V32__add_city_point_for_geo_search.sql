ALTER TABLE city
    ADD COLUMN IF NOT EXISTS city_point geography(POINT, 4326)
    GENERATED ALWAYS AS (
    CASE
    WHEN longitude IS NOT NULL AND latitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    ELSE NULL
    END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_city_city_point
    ON city USING GIST (city_point);
