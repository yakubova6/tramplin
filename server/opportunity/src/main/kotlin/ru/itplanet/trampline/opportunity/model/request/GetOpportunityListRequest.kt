package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import ru.itplanet.trampline.opportunity.model.enums.OpportunitySortBy
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.SortDirection
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat

data class GetOpportunityListRequest(
    @field:Min(1)
    @field:Max(100)
    val limit: Int = 20,

    @field:Min(0)
    val offset: Long = 0,

    val sortBy: OpportunitySortBy = OpportunitySortBy.PUBLISHED_AT,
    val sortDirection: SortDirection = SortDirection.DESC,

    val type: OpportunityType? = null,
    val workFormat: WorkFormat? = null,
    val cityId: Long? = null,
    val tagIds: List<Long> = emptyList(),

    @field:Min(0)
    val salaryFrom: Int? = null,

    @field:Min(0)
    val salaryTo: Int? = null,

    val search: String? = null
)
