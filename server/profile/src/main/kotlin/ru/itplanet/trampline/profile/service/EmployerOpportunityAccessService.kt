package ru.itplanet.trampline.profile.service

import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse

interface EmployerOpportunityAccessService {

    fun getEmployerOpportunityAccess(
        employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse
}
