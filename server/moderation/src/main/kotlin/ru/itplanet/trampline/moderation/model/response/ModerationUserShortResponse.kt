package ru.itplanet.trampline.moderation.model.response

import ru.itplanet.trampline.commons.model.Role

data class ModerationUserShortResponse(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
)
