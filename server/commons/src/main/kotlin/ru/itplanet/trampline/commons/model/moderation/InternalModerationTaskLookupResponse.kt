package ru.itplanet.trampline.commons.model.moderation

data class InternalModerationTaskLookupResponse(
    val exists: Boolean,
    val taskId: Long? = null,
)
