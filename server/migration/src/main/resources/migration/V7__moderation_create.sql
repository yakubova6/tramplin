CREATE TABLE IF NOT EXISTS moderation_task (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    entity_id BIGINT NOT NULL,
    task_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    assignee_user_id BIGINT REFERENCES users(id),
    created_by_user_id BIGINT REFERENCES users(id),
    resolution_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_moderation_task_entity_type
    CHECK (entity_type IN ('USER', 'APPLICANT_PROFILE', 'EMPLOYER_PROFILE', 'EMPLOYER_VERIFICATION', 'OPPORTUNITY', 'TAG')),
    CONSTRAINT chk_moderation_task_type
    CHECK (task_type IN ('USER_REVIEW', 'PROFILE_REVIEW', 'VERIFICATION_REVIEW', 'OPPORTUNITY_REVIEW', 'TAG_REVIEW', 'CONTENT_REVIEW')),
    CONSTRAINT chk_moderation_task_status
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_moderation_task_priority
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    );

CREATE INDEX IF NOT EXISTS idx_moderation_task_status_priority
    ON moderation_task (status, priority);

CREATE INDEX IF NOT EXISTS idx_moderation_task_assignee_status
    ON moderation_task (assignee_user_id, status);

CREATE INDEX IF NOT EXISTS idx_moderation_task_entity
    ON moderation_task (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS moderation_log (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES moderation_task(id) ON DELETE SET NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL,
    actor_user_id BIGINT REFERENCES users(id),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_moderation_log_action
    CHECK (action IN ('CREATED', 'ASSIGNED', 'APPROVED', 'REJECTED', 'STATUS_CHANGED', 'COMMENTED', 'UPDATED'))
    );

CREATE INDEX IF NOT EXISTS idx_moderation_log_task_id
    ON moderation_log (task_id);

CREATE INDEX IF NOT EXISTS idx_moderation_log_entity
    ON moderation_log (entity_type, entity_id, created_at DESC);

CREATE TRIGGER trg_moderation_task_set_updated_at
    BEFORE UPDATE ON moderation_task
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
