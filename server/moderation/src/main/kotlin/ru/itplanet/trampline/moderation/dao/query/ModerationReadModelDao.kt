package ru.itplanet.trampline.moderation.dao.query

import com.fasterxml.jackson.databind.JsonNode
import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.response.ModerationTaskAttachmentResponse

interface ModerationReadModelDao {

    fun findCurrentEntityState(
        entityType: ModerationEntityType,
        entityId: Long
    ): JsonNode

    fun findTaskAttachments(taskId: Long): List<ModerationTaskAttachmentResponse>
}
