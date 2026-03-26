package ru.itplanet.trampline.interaction.model.request

import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus

data class OpportunityResponseStatusUpdateRequest(
    val status: OpportunityResponseStatus,
    val employerComment: String? = null
)