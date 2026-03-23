CREATE TABLE IF NOT EXISTS opportunity (
    id BIGSERIAL PRIMARY KEY,
    employer_user_id BIGINT NOT NULL REFERENCES employer_profile(user_id),
    title VARCHAR(200) NOT NULL,
    short_description VARCHAR(1000) NOT NULL,
    full_description TEXT,
    requirements TEXT,
    company_name VARCHAR(200) NOT NULL,
    type VARCHAR(32) NOT NULL,
    work_format VARCHAR(20) NOT NULL,
    employment_type VARCHAR(20),
    grade VARCHAR(20),
    salary_from INTEGER,
    salary_to INTEGER,
    salary_currency CHAR(3) NOT NULL DEFAULT 'RUB',
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    event_date DATE,
    city_id BIGINT REFERENCES city(id),
    location_id BIGINT REFERENCES location(id),
    contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    moderation_comment TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_opportunity_type
    CHECK (type IN ('INTERNSHIP', 'VACANCY', 'MENTORING', 'EVENT')),
    CONSTRAINT chk_opportunity_work_format
    CHECK (work_format IN ('OFFICE', 'HYBRID', 'REMOTE', 'ONLINE')),
    CONSTRAINT chk_opportunity_employment_type
    CHECK (employment_type IS NULL OR employment_type IN ('FULL_TIME', 'PART_TIME', 'PROJECT')),
    CONSTRAINT chk_opportunity_grade
    CHECK (grade IS NULL OR grade IN ('INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR')),
    CONSTRAINT chk_opportunity_status
    CHECK (status IN ('DRAFT', 'PENDING_MODERATION', 'PUBLISHED', 'REJECTED', 'CLOSED', 'ARCHIVED', 'PLANNED')),
    CONSTRAINT chk_opportunity_salary_non_negative
    CHECK (
(salary_from IS NULL OR salary_from >= 0)
    AND (salary_to IS NULL OR salary_to >= 0)
    ),
    CONSTRAINT chk_opportunity_salary_range
    CHECK (salary_from IS NULL OR salary_to IS NULL OR salary_from <= salary_to),
    CONSTRAINT chk_opportunity_event_requires_event_date
    CHECK (type <> 'EVENT' OR event_date IS NOT NULL),
    CONSTRAINT chk_opportunity_publish_time_range
    CHECK (published_at IS NULL OR expires_at IS NULL OR published_at <= expires_at),
    CONSTRAINT chk_published_opportunity_has_published_at
    CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL),
    CONSTRAINT chk_opportunity_location_by_format
    CHECK (
    (work_format IN ('OFFICE', 'HYBRID') AND location_id IS NOT NULL)
    OR (work_format IN ('REMOTE', 'ONLINE') AND city_id IS NOT NULL)
    )
    );

CREATE TABLE IF NOT EXISTS opportunity_tag (
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (opportunity_id, tag_id)
    );

CREATE TABLE IF NOT EXISTS opportunity_resource_link (
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    link_type VARCHAR(32) NOT NULL DEFAULT 'RESOURCE',
    url TEXT NOT NULL,
    PRIMARY KEY (opportunity_id, sort_order),
    CONSTRAINT chk_opportunity_resource_link_type
    CHECK (link_type IN ('RESOURCE', 'APPLY', 'WEBSITE', 'SOCIAL', 'EVENT_REGISTRATION'))
    );

CREATE INDEX IF NOT EXISTS idx_opportunity_status_published_at
    ON opportunity (status, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_opportunity_type_work_format
    ON opportunity (type, work_format);

CREATE INDEX IF NOT EXISTS idx_opportunity_city_id
    ON opportunity (city_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_event_date
    ON opportunity (event_date);

CREATE INDEX IF NOT EXISTS idx_opportunity_expires_at
    ON opportunity (expires_at);

CREATE INDEX IF NOT EXISTS idx_opportunity_employer_status
    ON opportunity (employer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_opportunity_tag_tag_id
    ON opportunity_tag (tag_id);

CREATE TRIGGER trg_opportunity_set_updated_at
    BEFORE UPDATE ON opportunity
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
