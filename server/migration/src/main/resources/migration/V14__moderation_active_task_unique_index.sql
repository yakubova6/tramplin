CREATE UNIQUE INDEX IF NOT EXISTS uk_moderation_task_active_unique
    ON moderation_task (entity_type, entity_id, task_type)
    WHERE status IN ('OPEN', 'IN_PROGRESS');
