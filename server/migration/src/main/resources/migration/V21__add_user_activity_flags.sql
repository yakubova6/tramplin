ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deactivated_by_user_id BIGINT REFERENCES users(id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_role_active
    ON users (role, is_active);
