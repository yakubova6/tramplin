package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CommentModerationTaskRequest(
    @field:NotBlank(message = "Текст комментария обязателен")
    @field:Size(max = 4000, message = "Текст комментария не должен превышать 4000 символов")
    val text: String,
)
