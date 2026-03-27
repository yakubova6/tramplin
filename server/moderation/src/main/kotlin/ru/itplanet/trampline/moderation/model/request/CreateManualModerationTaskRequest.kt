package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType

data class CreateManualModerationTaskRequest(
    val entityType: ModerationEntityType,

    @field:Positive
    val entityId: Long,

    val taskType: ModerationTaskType,

    val priority: ModerationTaskPriority,

    @field:NotBlank
    @field:Size(max = 1000)
    val comment: String,
)
