ALTER TABLE applicant_profile
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(32);

UPDATE applicant_profile
SET moderation_status = 'DRAFT'
WHERE moderation_status IS NULL;

ALTER TABLE applicant_profile
    ALTER COLUMN moderation_status SET DEFAULT 'DRAFT';

ALTER TABLE applicant_profile
    ALTER COLUMN moderation_status SET NOT NULL;

ALTER TABLE applicant_profile
DROP CONSTRAINT IF EXISTS chk_applicant_profile_moderation_status;

ALTER TABLE applicant_profile
    ADD CONSTRAINT chk_applicant_profile_moderation_status
        CHECK (moderation_status IN ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'NEEDS_REVISION'));

CREATE INDEX IF NOT EXISTS idx_applicant_profile_moderation_status
    ON applicant_profile (moderation_status);
