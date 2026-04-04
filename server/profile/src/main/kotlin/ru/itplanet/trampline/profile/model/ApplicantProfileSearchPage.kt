package ru.itplanet.trampline.profile.model

data class ApplicantProfileSearchPage(
    val items: List<ApplicantProfileSearchItem>,
    val limit: Int,
    val offset: Long,
    val total: Long,
)
