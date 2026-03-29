package ru.itplanet.trampline.interaction.model.request

import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size

data class CreateContactRecommendationRequest(
    @field:Positive
    val opportunityId: Long,

    @field:Positive
    val toApplicantUserId: Long,

    @field:Size(max = 2000)
    val message: String? = null,
)
