CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS city (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    region_name VARCHAR(150) NOT NULL DEFAULT '',
    country_code VARCHAR(2) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_city_country_code
    CHECK (CHAR_LENGTH(country_code) = 2),
    CONSTRAINT chk_city_coordinates
    CHECK (
(latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    ),
    CONSTRAINT uk_city_name_region_country
    UNIQUE (name, region_name, country_code)
    );

CREATE INDEX IF NOT EXISTS idx_city_country_name
    ON city (country_code, name);

CREATE TABLE IF NOT EXISTS location (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES city(id),
    title VARCHAR(255),
    address_line VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    postal_code VARCHAR(20),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_location_coordinates
    CHECK (
(latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
    );

CREATE INDEX IF NOT EXISTS idx_location_city_id
    ON location (city_id);

CREATE TRIGGER trg_city_set_updated_at
    BEFORE UPDATE ON city
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_location_set_updated_at
    BEFORE UPDATE ON location
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
