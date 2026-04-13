package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.commons.model.profile.EmployerProfileModerationStatus

data class EmployerProfileWorkspace(
    val currentProfile: EmployerProfile,
    val publicProfile: EmployerProfile,
    val moderationStatus: EmployerProfileModerationStatus,
    val hasApprovedPublicVersion: Boolean,
)
