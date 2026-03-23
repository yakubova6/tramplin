CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_email_lowercase
    CHECK (email = LOWER(email)),
    CONSTRAINT chk_users_role
    CHECK (role IN ('APPLICANT', 'EMPLOYER', 'CURATOR', 'ADMIN')),
    CONSTRAINT chk_users_status
    CHECK (status IN ('ACTIVE', 'BLOCKED', 'PENDING_VERIFICATION', 'DELETED'))
    );

CREATE INDEX IF NOT EXISTS idx_users_role_status
    ON users (role, status);

CREATE TABLE IF NOT EXISTS applicant_profile (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    university_name VARCHAR(255),
    faculty_name VARCHAR(255),
    study_program VARCHAR(255),
    course SMALLINT,
    graduation_year SMALLINT,
    city_id BIGINT REFERENCES city(id),
    about TEXT,
    resume_text TEXT,
    portfolio_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    contact_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    profile_visibility VARCHAR(32) NOT NULL DEFAULT 'AUTHENTICATED',
    resume_visibility VARCHAR(32) NOT NULL DEFAULT 'AUTHENTICATED',
    applications_visibility VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
    contacts_visibility VARCHAR(32) NOT NULL DEFAULT 'AUTHENTICATED',
    open_to_work BOOLEAN NOT NULL DEFAULT TRUE,
    open_to_events BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_applicant_course
    CHECK (course IS NULL OR course BETWEEN 1 AND 8),
    CONSTRAINT chk_applicant_graduation_year
    CHECK (graduation_year IS NULL OR graduation_year BETWEEN 2000 AND 2100),
    CONSTRAINT chk_applicant_profile_visibility
    CHECK (profile_visibility IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC')),
    CONSTRAINT chk_applicant_resume_visibility
    CHECK (resume_visibility IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC')),
    CONSTRAINT chk_applicant_applications_visibility
    CHECK (applications_visibility IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC')),
    CONSTRAINT chk_applicant_contacts_visibility
    CHECK (contacts_visibility IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC'))
    );

CREATE INDEX IF NOT EXISTS idx_applicant_profile_city_id
    ON applicant_profile (city_id);

CREATE TABLE IF NOT EXISTS employer_profile (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    inn VARCHAR(12),
    description TEXT,
    industry VARCHAR(255),
    website_url TEXT,
    social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    public_contacts JSONB NOT NULL DEFAULT '{}'::jsonb,
    company_size VARCHAR(64),
    founded_year SMALLINT,
    city_id BIGINT REFERENCES city(id),
    location_id BIGINT REFERENCES location(id),
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_employer_inn
    CHECK (inn IS NULL OR inn ~ '^[0-9]{10}([0-9]{2})?$'),
    CONSTRAINT chk_employer_founded_year
    CHECK (founded_year IS NULL OR founded_year BETWEEN 1800 AND 2100),
    CONSTRAINT chk_employer_verification_status
    CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED'))
    );

CREATE UNIQUE INDEX IF NOT EXISTS uk_employer_profile_inn
    ON employer_profile (inn)
    WHERE inn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employer_profile_city_id
    ON employer_profile (city_id);

CREATE TABLE IF NOT EXISTS employer_verification (
    id BIGSERIAL PRIMARY KEY,
    employer_user_id BIGINT NOT NULL REFERENCES employer_profile(user_id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    verification_method VARCHAR(32) NOT NULL,
    corporate_email VARCHAR(255),
    inn VARCHAR(12),
    professional_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    submitted_comment TEXT,
    review_comment TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_employer_verification_status
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
    CONSTRAINT chk_employer_verification_method
    CHECK (verification_method IN ('CORPORATE_EMAIL', 'TIN', 'PROFESSIONAL_LINKS', 'MANUAL')),
    CONSTRAINT chk_employer_verification_inn
    CHECK (inn IS NULL OR inn ~ '^[0-9]{10}([0-9]{2})?$'),
    CONSTRAINT chk_employer_verification_payload
    CHECK (
(verification_method = 'CORPORATE_EMAIL' AND corporate_email IS NOT NULL)
    OR (verification_method = 'TIN' AND inn IS NOT NULL)
    OR (verification_method IN ('PROFESSIONAL_LINKS', 'MANUAL'))
    )
    );

CREATE INDEX IF NOT EXISTS idx_employer_verification_employer_status
    ON employer_verification (employer_user_id, status);

CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_applicant_profile_set_updated_at
    BEFORE UPDATE ON applicant_profile
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employer_profile_set_updated_at
    BEFORE UPDATE ON employer_profile
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employer_verification_set_updated_at
    BEFORE UPDATE ON employer_verification
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
