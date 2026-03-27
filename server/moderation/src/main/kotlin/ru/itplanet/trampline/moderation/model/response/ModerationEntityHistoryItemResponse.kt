package ru.itplanet.trampline.moderation.model.response

import com.fasterxml.jackson.databind.JsonNode
import ru.itplanet.trampline.moderation.model.ModerationLogAction
import java.time.OffsetDateTime

data class ModerationEntityHistoryItemResponse(
    val id: Long,
    val taskId: Long?,
    val action: ModerationLogAction,
    val actor: ModerationUserShortResponse?,
    val payload: JsonNode,
    val createdAt: OffsetDateTime
)
