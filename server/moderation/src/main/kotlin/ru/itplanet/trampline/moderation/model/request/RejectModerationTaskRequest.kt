package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.moderation.model.ModerationSeverity

data class RejectModerationTaskRequest(
    @field:NotBlank(message = "Комментарий обязателен")
    @field:Size(max = 4000, message = "Комментарий не должен превышать 4000 символов")
    val comment: String,

    @field:NotBlank(message = "Код причины обязателен")
    @field:Size(max = 100, message = "Код причины не должен превышать 100 символов")
    val reasonCode: String,

    val severity: ModerationSeverity = ModerationSeverity.NORMAL,

    val notifyUser: Boolean = false,
)
