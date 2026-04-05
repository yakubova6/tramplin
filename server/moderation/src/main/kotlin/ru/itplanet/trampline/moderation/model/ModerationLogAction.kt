package ru.itplanet.trampline.moderation.model

enum class ModerationLogAction {
    CREATED,
    ASSIGNED,
    APPROVED,
    REJECTED,
    REQUESTED_CHANGES,
    STATUS_CHANGED,
    COMMENTED,
    UPDATED
}
