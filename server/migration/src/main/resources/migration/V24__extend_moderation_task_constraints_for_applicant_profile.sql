ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_entity_type;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_entity_type
        CHECK (entity_type IN (
                           'APPLICANT_PROFILE',
                           'EMPLOYER_PROFILE',
                           'EMPLOYER_VERIFICATION',
                           'OPPORTUNITY',
                           'TAG'
        ));

ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_type;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_type
        CHECK (task_type IN (
                         'PROFILE_REVIEW',
                         'VERIFICATION_REVIEW',
                         'OPPORTUNITY_REVIEW',
                         'TAG_REVIEW',
                         'CONTENT_REVIEW'
        ));
