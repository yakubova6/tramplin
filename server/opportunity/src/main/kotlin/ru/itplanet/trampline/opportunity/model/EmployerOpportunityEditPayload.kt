package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.commons.model.OpportunityContactInfo
import ru.itplanet.trampline.commons.model.OpportunityResourceLink
import ru.itplanet.trampline.commons.model.enums.EmploymentType
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

data class EmployerOpportunityEditPayload(
    val id: Long,
    val title: String,
    val shortDescription: String,
    val fullDescription: String?,
    val requirements: String?,
    val companyName: String,
    val type: OpportunityType,
    val workFormat: WorkFormat,
    val employmentType: EmploymentType?,
    val grade: Grade?,
    val salaryFrom: Int?,
    val salaryTo: Int?,
    val salaryCurrency: String,
    val status: OpportunityStatus,
    val publishedAt: OffsetDateTime?,
    val expiresAt: OffsetDateTime?,
    val eventDate: LocalDate?,
    val cityId: Long?,
    val locationId: Long?,
    val contactInfo: OpportunityContactInfo,
    val resourceLinks: List<OpportunityResourceLink>,
    val tagIds: List<Long>,
    val moderationComment: String?,
    val createdAt: OffsetDateTime?,
    val updatedAt: OffsetDateTime?,
    val media: List<EmployerOpportunityMediaItem> = emptyList(),
)
