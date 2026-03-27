package ru.itplanet.trampline.commons.model.moderation

data class InternalModerationBlockUserRequest(
    val moderatorUserId: Long,
    val comment: String? = null,
    val reasonCode: String? = null,
)
