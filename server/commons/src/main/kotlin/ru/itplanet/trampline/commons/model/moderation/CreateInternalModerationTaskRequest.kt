package ru.itplanet.trampline.commons.model.moderation

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size

data class CreateInternalModerationTaskRequest(
    val entityType: ModerationEntityType,

    @field:Positive
    val entityId: Long,

    val taskType: ModerationTaskType,

    val priority: ModerationTaskPriority,

    @field:Positive
    val createdByUserId: Long? = null,

    val snapshot: JsonNode = JsonNodeFactory.instance.objectNode(),

    @field:NotBlank
    @field:Size(max = 100)
    val sourceService: String,

    @field:NotBlank
    @field:Size(max = 100)
    val sourceAction: String,
)
