package ru.itplanet.trampline.moderation.model.response

import com.fasterxml.jackson.databind.JsonNode
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus
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
