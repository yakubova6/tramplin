ALTER TABLE city
    ADD COLUMN IF NOT EXISTS fias_id VARCHAR(36);

DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'city'
          AND column_name = 'city_point'
    ) THEN
        EXECUTE '
            ALTER TABLE city
                ADD COLUMN city_point geography(POINT, 4326)
                GENERATED ALWAYS AS (
                    CASE
                        WHEN longitude IS NOT NULL AND latitude IS NOT NULL
                            THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                        ELSE NULL
                    END
                ) STORED
        ';
END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_city_fias_id
    ON city (fias_id)
    WHERE fias_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_city_name_active
    ON city (is_active, name);

CREATE INDEX IF NOT EXISTS idx_city_city_point
    ON city
    USING GIST (city_point);

ALTER TABLE location
    ADD COLUMN IF NOT EXISTS owner_employer_user_id BIGINT REFERENCES employer_profile(user_id);

ALTER TABLE location
    ADD COLUMN IF NOT EXISTS fias_id VARCHAR(36);

ALTER TABLE location
    ADD COLUMN IF NOT EXISTS unrestricted_value TEXT;

ALTER TABLE location
    ADD COLUMN IF NOT EXISTS qc_geo SMALLINT;

ALTER TABLE location
    ADD COLUMN IF NOT EXISTS source VARCHAR(16);

ALTER TABLE location
DROP CONSTRAINT IF EXISTS chk_location_source;

ALTER TABLE location
    ADD CONSTRAINT chk_location_source
        CHECK (source IS NULL OR source IN ('MANUAL', 'DADATA', 'IMPORT'));

CREATE INDEX IF NOT EXISTS idx_location_owner_employer_user_id
    ON location (owner_employer_user_id);

CREATE INDEX IF NOT EXISTS idx_location_city_owner
    ON location (city_id, owner_employer_user_id);

UPDATE location
SET source = 'IMPORT'
WHERE source IS NULL;

UPDATE opportunity
SET city_id = NULL
WHERE work_format IN ('OFFICE', 'HYBRID')
  AND location_id IS NOT NULL
  AND city_id IS NOT NULL;

UPDATE opportunity
SET location_id = NULL
WHERE work_format IN ('REMOTE', 'ONLINE')
  AND city_id IS NOT NULL
  AND location_id IS NOT NULL;

ALTER TABLE opportunity
DROP CONSTRAINT IF EXISTS chk_opportunity_location_by_format;

ALTER TABLE opportunity
    ADD CONSTRAINT chk_opportunity_location_by_format
        CHECK (
            (work_format IN ('OFFICE', 'HYBRID') AND location_id IS NOT NULL AND city_id IS NULL)
                OR
            (work_format IN ('REMOTE', 'ONLINE') AND city_id IS NOT NULL AND location_id IS NULL)
            );
