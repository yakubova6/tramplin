package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class AssignModerationTaskRequest(
    @field:NotBlank(message = "Комментарий обязателен")
    @field:Size(max = 1000, message = "Комментарий не должен превышать 1000 символов")
    val comment: String,
)
