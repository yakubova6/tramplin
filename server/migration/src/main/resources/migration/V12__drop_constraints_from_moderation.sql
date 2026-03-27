BEGIN;

DELETE FROM moderation_log
WHERE entity_type IN ('USER', 'APPLICANT_PROFILE');

DELETE FROM moderation_task
WHERE entity_type IN ('USER', 'APPLICANT_PROFILE');

ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_type;

ALTER TABLE moderation_task
DROP COLUMN IF EXISTS task_type;

ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_entity_type;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_entity_type
        CHECK (
            entity_type IN (
                            'EMPLOYER_PROFILE',
                            'EMPLOYER_VERIFICATION',
                            'OPPORTUNITY',
                            'TAG'
                )
            );

COMMIT;
