package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

data class InternalApplicantContactResponse(
    val contactUserId: Long,
    val contactName: String?,
    val createdAt: OffsetDateTime?,
)

data class InternalApplicantApplicationResponse(
    val id: Long,
    val opportunityId: Long,
    val opportunityTitle: String?,
    val status: OpportunityResponseStatus,
    val createdAt: OffsetDateTime?,
)

data class InternalApplicantContactRelationResponse(
    val accepted: Boolean,
)
