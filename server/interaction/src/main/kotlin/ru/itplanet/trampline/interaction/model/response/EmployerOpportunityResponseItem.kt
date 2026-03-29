package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.time.OffsetDateTime

data class EmployerOpportunityResponseItem(
    val id: Long,
    val opportunityId: Long,
    val opportunityTitle: String,
    val applicant: ApplicantResponseSummary,
    val status: OpportunityResponseStatus,
    val employerComment: String?,
    val applicantComment: String?,
    val coverLetter: String?,
    val resumeFileId: Long?,
    val createdAt: OffsetDateTime,
)
