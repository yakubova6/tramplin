package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class AssignModerationTaskRequest(
    @field:NotBlank
    @field:Size(max = 1000)
    val comment: String,
)
