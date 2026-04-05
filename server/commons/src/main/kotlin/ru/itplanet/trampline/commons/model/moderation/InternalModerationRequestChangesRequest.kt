package ru.itplanet.trampline.commons.model.moderation

data class InternalModerationRequestChangesRequest(
    val taskId: Long,
    val moderatorUserId: Long,
    val comment: String,
    val reasonCode: String?,
    val fieldIssues: List<ModerationFieldIssue> = emptyList(),
    val notifyUser: Boolean = false,
)
