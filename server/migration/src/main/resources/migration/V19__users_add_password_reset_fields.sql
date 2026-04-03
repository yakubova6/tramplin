ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_code_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_reset_code_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_reset_code_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_reset_code_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMPTZ;
