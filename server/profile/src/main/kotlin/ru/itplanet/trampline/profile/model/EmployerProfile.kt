package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.profile.model.enums.VerificationStatus

data class EmployerProfile (
    val userId: Long,
    val companyName: String,
    val legalName: String?,
    val inn: String,
    val description: String?,
    val industry: String?,
    val websiteUrl: String?,
    val cityId: Long?,
    val locationId: Long?,
    val companySize: String?,
    val foundedYear: Short?,
    val socialLinks: List<String>, // TODO: переделать в List моделей
    val publicContacts: Map<String, String>, // TODO: переделать в List моделей
    val verificationStatus: VerificationStatus,
)