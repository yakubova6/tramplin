package ru.itplanet.trampline.moderation.model.request

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ApproveModerationTaskRequest(
    @field:NotBlank
    @field:Size(max = 4000)
    val comment: String,

    @field:NotBlank
    @field:Size(max = 100)
    val reasonCode: String,

    val applyPatch: JsonNode = JsonNodeFactory.instance.objectNode(),

    val notifyUser: Boolean = false,
)
