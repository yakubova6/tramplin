package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CommentModerationTaskRequest(
    @field:NotBlank
    @field:Size(max = 4000)
    val text: String,
)
