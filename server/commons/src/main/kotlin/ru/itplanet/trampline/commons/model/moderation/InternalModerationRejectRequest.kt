package ru.itplanet.trampline.commons.model.moderation

data class InternalModerationRejectRequest(
    val taskId: Long,
    val moderatorUserId: Long,
    val comment: String,
    val reasonCode: String?,
    val severity: String?,
    val notifyUser: Boolean = false,
)
