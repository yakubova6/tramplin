package ru.itplanet.trampline.moderation.model.response

import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationTaskPriority
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.ModerationTaskType
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
