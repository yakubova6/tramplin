package ru.itplanet.trampline.moderation.model.response

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.Status

data class ModerationUserShortResponse(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
    val status: Status
)
