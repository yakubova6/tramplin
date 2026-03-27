package ru.itplanet.trampline.moderation.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.moderation.model.ModerationSeverity

data class RejectModerationTaskRequest(
    @field:NotBlank
    @field:Size(max = 4000)
    val comment: String,

    @field:NotBlank
    @field:Size(max = 100)
    val reasonCode: String,

    val severity: ModerationSeverity = ModerationSeverity.NORMAL,

    val notifyUser: Boolean = false,
)
