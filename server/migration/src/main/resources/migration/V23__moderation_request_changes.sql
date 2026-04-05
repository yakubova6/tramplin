ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_status;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_status
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'NEEDS_REVISION', 'CANCELLED'));

ALTER TABLE moderation_log
DROP CONSTRAINT IF EXISTS chk_moderation_log_action;

ALTER TABLE moderation_log
    ADD CONSTRAINT chk_moderation_log_action
        CHECK (action IN ('CREATED', 'ASSIGNED', 'APPROVED', 'REJECTED', 'REQUESTED_CHANGES', 'STATUS_CHANGED', 'COMMENTED', 'UPDATED'));
