package ru.itplanet.trampline.commons.model.moderation

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory

data class InternalModerationApproveRequest(
    val taskId: Long,
    val moderatorUserId: Long,
    val comment: String,
    val reasonCode: String?,
    val applyPatch: JsonNode = JsonNodeFactory.instance.objectNode(),
    val notifyUser: Boolean = false,
)
