package ru.itplanet.trampline.profile.model.response

import java.time.OffsetDateTime

data class EmployerVerificationResponse(
    val id: Long,
    val employerUserId: Long,
    val status: String,
    val verificationMethod: String,
    val corporateEmail: String?,
    val inn: String?,
    val professionalLinks: List<String>,
    val submittedComment: String?,
    val submittedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime?
)