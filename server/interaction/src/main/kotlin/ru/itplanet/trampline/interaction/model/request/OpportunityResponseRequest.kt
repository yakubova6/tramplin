package ru.itplanet.trampline.interaction.model.request

data class OpportunityResponseRequest (
    val opportunityId: Long,
    val applicantComment: String? = null,
     val coverLetter: String? = null
)