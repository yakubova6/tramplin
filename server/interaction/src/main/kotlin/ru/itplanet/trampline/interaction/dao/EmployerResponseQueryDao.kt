package ru.itplanet.trampline.interaction.dao

import ru.itplanet.trampline.interaction.model.request.GetEmployerResponseListRequest
import ru.itplanet.trampline.interaction.model.response.EmployerOpportunityResponseItem
import ru.itplanet.trampline.interaction.model.response.EmployerResponsePage

interface EmployerResponseQueryDao {
    fun findResponses(
        employerUserId: Long,
        request: GetEmployerResponseListRequest,
    ): EmployerResponsePage<EmployerOpportunityResponseItem>

    fun findOpportunityEmployerUserId(opportunityId: Long): Long?
}
