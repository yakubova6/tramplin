CREATE TABLE IF NOT EXISTS file_asset (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL',
    storage_key TEXT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 CHAR(64),
    kind VARCHAR(32) NOT NULL,
    visibility VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
    status VARCHAR(32) NOT NULL DEFAULT 'READY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_file_asset_storage
    UNIQUE (storage_provider, storage_key),
    CONSTRAINT chk_file_asset_size
    CHECK (size_bytes >= 0),
    CONSTRAINT chk_file_asset_provider
    CHECK (storage_provider IN ('LOCAL', 'S3', 'MINIO')),
    CONSTRAINT chk_file_asset_kind
    CHECK (kind IN (
           'AVATAR',
           'RESUME',
           'PORTFOLIO',
           'LOGO',
           'OPPORTUNITY_MEDIA',
           'VERIFICATION_ATTACHMENT',
           'APPLICATION_ATTACHMENT',
           'OTHER'
           )),
    CONSTRAINT chk_file_asset_visibility
    CHECK (visibility IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC')),
    CONSTRAINT chk_file_asset_status
    CHECK (status IN ('UPLOADING', 'READY', 'DELETED', 'FAILED'))
    );

CREATE INDEX IF NOT EXISTS idx_file_asset_owner_kind
    ON file_asset (owner_user_id, kind);

CREATE TABLE IF NOT EXISTS file_attachment (
    id BIGSERIAL PRIMARY KEY,
    file_id BIGINT NOT NULL REFERENCES file_asset(id) ON DELETE CASCADE,
    entity_type VARCHAR(32) NOT NULL,
    entity_id BIGINT NOT NULL,
    attachment_role VARCHAR(32) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_file_attachment_file_entity_role
    UNIQUE (file_id, entity_type, entity_id, attachment_role),
    CONSTRAINT chk_file_attachment_entity_type
    CHECK (entity_type IN (
           'APPLICANT_PROFILE',
           'EMPLOYER_PROFILE',
           'EMPLOYER_VERIFICATION',
           'OPPORTUNITY',
           'OPPORTUNITY_RESPONSE',
           'MODERATION_TASK'
                          )),
    CONSTRAINT chk_file_attachment_role
    CHECK (attachment_role IN (
           'AVATAR',
           'RESUME',
           'PORTFOLIO',
           'LOGO',
           'MEDIA',
           'VERIFICATION',
           'ATTACHMENT'
                              ))
    );

CREATE INDEX IF NOT EXISTS idx_file_attachment_entity
    ON file_attachment (entity_type, entity_id);

CREATE TRIGGER trg_file_asset_set_updated_at
    BEFORE UPDATE ON file_asset
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
