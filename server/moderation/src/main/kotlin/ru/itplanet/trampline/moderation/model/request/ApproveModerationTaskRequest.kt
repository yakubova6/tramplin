package ru.itplanet.trampline.moderation.model.request

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ApproveModerationTaskRequest(
    @field:NotBlank(message = "Комментарий обязателен")
    @field:Size(max = 4000, message = "Комментарий не должен превышать 4000 символов")
    val comment: String,

    @field:NotBlank(message = "Код причины обязателен")
    @field:Size(max = 100, message = "Код причины не должен превышать 100 символов")
    val reasonCode: String,

    val applyPatch: JsonNode = JsonNodeFactory.instance.objectNode(),

    val notifyUser: Boolean = false,
)
