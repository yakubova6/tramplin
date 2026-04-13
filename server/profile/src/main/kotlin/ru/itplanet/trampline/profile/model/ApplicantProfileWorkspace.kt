package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.commons.model.profile.ApplicantProfileModerationStatus

data class ApplicantProfileWorkspace(
    val currentProfile: ApplicantProfile,
    val publicProfile: ApplicantProfile,
    val moderationStatus: ApplicantProfileModerationStatus,
    val hasApprovedPublicVersion: Boolean,
)
