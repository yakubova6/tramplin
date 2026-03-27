BEGIN;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_status;

DROP INDEX IF EXISTS idx_users_role_status;

ALTER TABLE users
DROP COLUMN IF EXISTS status;

COMMIT;

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users (role);
