ALTER TABLE applicant_profile
    ADD COLUMN IF NOT EXISTS approved_public_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
