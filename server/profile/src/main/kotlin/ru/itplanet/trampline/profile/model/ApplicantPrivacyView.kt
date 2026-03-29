package ru.itplanet.trampline.profile.model

import java.time.OffsetDateTime

data class ApplicantContactSummary(
    val contactUserId: Long,
    val contactName: String?,
    val createdAt: OffsetDateTime?,
)

data class ApplicantApplicationSummary(
    val id: Long,
    val opportunityId: Long,
    val opportunityTitle: String?,
    val status: ApplicantApplicationStatus,
    val createdAt: OffsetDateTime?,
)

enum class ApplicantApplicationStatus {
    SUBMITTED,
    IN_REVIEW,
    ACCEPTED,
    REJECTED,
    RESERVE,
    WITHDRAWN,
}
