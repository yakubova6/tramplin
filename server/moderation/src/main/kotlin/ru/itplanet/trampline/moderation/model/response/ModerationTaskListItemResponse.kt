package ru.itplanet.trampline.moderation.model.response

import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import java.time.OffsetDateTime

data class ModerationTaskListItemResponse(
    val id: Long,
    val entityType: ModerationEntityType,
    val entityId: Long,
    val taskType: ModerationTaskType,
    val status: ModerationTaskStatus,
    val priority: ModerationTaskPriority,
    val assignee: ModerationUserShortResponse?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val snapshotSummary: String?
)
