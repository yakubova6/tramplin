CREATE TABLE IF NOT EXISTS opportunity_response (
    id BIGSERIAL PRIMARY KEY,
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    applicant_user_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    resume_file_id BIGINT REFERENCES file_asset(id),
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    employer_comment TEXT,
    applicant_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT uk_opportunity_response_unique
    UNIQUE (opportunity_id, applicant_user_id),
    CONSTRAINT chk_opportunity_response_status
    CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'RESERVE', 'WITHDRAWN'))
    );

CREATE INDEX IF NOT EXISTS idx_opportunity_response_applicant_status
    ON opportunity_response (applicant_user_id, status);

CREATE INDEX IF NOT EXISTS idx_opportunity_response_opportunity_status
    ON opportunity_response (opportunity_id, status);

CREATE TABLE IF NOT EXISTS favorite (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL,
    opportunity_id BIGINT REFERENCES opportunity(id) ON DELETE CASCADE,
    employer_user_id BIGINT REFERENCES employer_profile(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_favorite_target_type
    CHECK (target_type IN ('OPPORTUNITY', 'EMPLOYER')),
    CONSTRAINT chk_favorite_exactly_one_target
    CHECK (
(target_type = 'OPPORTUNITY' AND opportunity_id IS NOT NULL AND employer_user_id IS NULL)
    OR
(target_type = 'EMPLOYER' AND employer_user_id IS NOT NULL AND opportunity_id IS NULL)
    )
    );

CREATE UNIQUE INDEX IF NOT EXISTS uk_favorite_user_opportunity
    ON favorite (user_id, opportunity_id)
    WHERE target_type = 'OPPORTUNITY';

CREATE UNIQUE INDEX IF NOT EXISTS uk_favorite_user_employer
    ON favorite (user_id, employer_user_id)
    WHERE target_type = 'EMPLOYER';

CREATE INDEX IF NOT EXISTS idx_favorite_user_created_at
    ON favorite (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS applicant_contact (
    user_low_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    user_high_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    initiated_by_user_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (user_low_id, user_high_id),
    CONSTRAINT chk_applicant_contact_order
    CHECK (user_low_id < user_high_id),
    CONSTRAINT chk_applicant_contact_initiator
    CHECK (initiated_by_user_id = user_low_id OR initiated_by_user_id = user_high_id),
    CONSTRAINT chk_applicant_contact_status
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'))
    );

CREATE INDEX IF NOT EXISTS idx_applicant_contact_status
    ON applicant_contact (status);

CREATE TABLE IF NOT EXISTS contact_recommendation (
    id BIGSERIAL PRIMARY KEY,
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    from_applicant_user_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    to_applicant_user_id BIGINT NOT NULL REFERENCES applicant_profile(user_id) ON DELETE CASCADE,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_contact_recommendation_different_users
    CHECK (from_applicant_user_id <> to_applicant_user_id),
    CONSTRAINT uk_contact_recommendation
    UNIQUE (opportunity_id, from_applicant_user_id, to_applicant_user_id)
    );

CREATE INDEX IF NOT EXISTS idx_contact_recommendation_to_user
    ON contact_recommendation (to_applicant_user_id, created_at DESC);

CREATE TRIGGER trg_opportunity_response_set_updated_at
    BEFORE UPDATE ON opportunity_response
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_applicant_contact_set_updated_at
    BEFORE UPDATE ON applicant_contact
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
