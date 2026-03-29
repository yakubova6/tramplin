package ru.itplanet.trampline.commons.model.profile

data class InternalEmployerOpportunityAccessResponse(
    val employerUserId: Long,
    val verificationStatus: String,
    val canCreateOpportunities: Boolean,
)
