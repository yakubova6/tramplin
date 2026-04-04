package ru.itplanet.trampline.profile.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class GetApplicantProfileListRequest(
    @field:Min(1)
    @field:Max(100)
    val limit: Int = 20,

    @field:Min(0)
    val offset: Long = 0,

    val cityId: Long? = null,
    val skillTagIds: List<Long> = emptyList(),
    val interestTagIds: List<Long> = emptyList(),
    val openToWork: Boolean? = null,
    val openToEvents: Boolean? = null,
    val search: String? = null,
)
