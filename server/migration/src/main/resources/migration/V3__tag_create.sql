CREATE TABLE IF NOT EXISTS tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(32) NOT NULL,
    created_by_type VARCHAR(32) NOT NULL,
    created_by_user_id BIGINT REFERENCES users(id),
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tag_name_category
    UNIQUE (name, category),
    CONSTRAINT chk_tag_category
    CHECK (category IN ('TECH', 'GRADE', 'EMPLOYMENT_TYPE', 'DIRECTION', 'BENEFIT', 'OTHER')),
    CONSTRAINT chk_tag_created_by_type
    CHECK (created_by_type IN ('SYSTEM', 'EMPLOYER', 'CURATOR', 'ADMIN')),
    CONSTRAINT chk_tag_moderation_status
    CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED'))
    );

CREATE INDEX IF NOT EXISTS idx_tag_category_active
    ON tag (category, is_active);

CREATE TABLE IF NOT EXISTS applicant_tag (
    applicant_user_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    relation_type VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (applicant_user_id, tag_id, relation_type),
    CONSTRAINT chk_applicant_tag_relation_type
    CHECK (relation_type IN ('SKILL', 'INTEREST'))
    );

CREATE INDEX IF NOT EXISTS idx_applicant_tag_tag_id
    ON applicant_tag (tag_id);

CREATE TRIGGER trg_tag_set_updated_at
    BEFORE UPDATE ON tag
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
