BEGIN;

ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_type;

ALTER TABLE moderation_task
    ADD COLUMN IF NOT EXISTS task_type VARCHAR(32);

UPDATE moderation_task
SET task_type = CASE
                    WHEN entity_type = 'EMPLOYER_VERIFICATION' THEN 'VERIFICATION_REVIEW'
                    WHEN entity_type = 'OPPORTUNITY' THEN 'OPPORTUNITY_REVIEW'
                    WHEN entity_type = 'TAG' THEN 'TAG_REVIEW'
                    WHEN entity_type = 'EMPLOYER_PROFILE' THEN 'CONTENT_REVIEW'
                    ELSE NULL
    END
WHERE task_type IS NULL;

ALTER TABLE moderation_task
    ALTER COLUMN task_type SET NOT NULL;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_type
        CHECK (
            task_type IN (
                          'VERIFICATION_REVIEW',
                          'OPPORTUNITY_REVIEW',
                          'TAG_REVIEW',
                          'CONTENT_REVIEW'
                )
            );

COMMIT;
