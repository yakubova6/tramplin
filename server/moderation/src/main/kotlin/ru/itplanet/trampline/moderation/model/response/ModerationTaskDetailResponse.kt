package ru.itplanet.trampline.moderation.model.response

import com.fasterxml.jackson.databind.JsonNode
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.ModerationTaskPriority
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
import ru.itplanet.trampline.moderation.model.ModerationTaskType
import java.time.OffsetDateTime

data class ModerationTaskDetailResponse(
    val id: Long,
    val entityType: ModerationEntityType,
    val entityId: Long,
    val taskType: ModerationTaskType,
    val status: ModerationTaskStatus,
    val priority: ModerationTaskPriority,
    val assignee: ModerationUserShortResponse?,
    val createdBy: ModerationUserShortResponse?,
    val resolutionComment: String?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
    val resolvedAt: OffsetDateTime?,
    val createdSnapshot: JsonNode,
    val currentEntityState: JsonNode,
    val history: List<ModerationTaskHistoryItemResponse>,
    val attachments: List<ModerationTaskAttachmentResponse>,
    val availableActions: List<String>
)
