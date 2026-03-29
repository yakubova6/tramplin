package ru.itplanet.trampline.interaction.model.response

data class ApplicantResponseSummary(
    val applicantUserId: Long,
    val displayName: String?,
    val fullName: String?,
    val universityName: String?,
    val course: Short?,
    val graduationYear: Short?,
    val openToWork: Boolean,
    val openToEvents: Boolean,
    val skills: List<String>,
)
