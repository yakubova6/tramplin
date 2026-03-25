package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityEditPayload
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityRequest
import ru.itplanet.trampline.opportunity.model.request.GetEmployerOpportunityListRequest

interface EmployerOpportunityService {

    fun create(
        currentUserId: Long,
        request: CreateEmployerOpportunityRequest
    ): EmployerOpportunityCard

    fun getMyOpportunities(
        currentUserId: Long,
        request: GetEmployerOpportunityListRequest
    ): OpportunityPage<EmployerOpportunityListItem>

    fun getMyOpportunity(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload

    fun update(
        currentUserId: Long,
        opportunityId: Long,
        request: CreateEmployerOpportunityRequest
    ): EmployerOpportunityEditPayload

    fun returnToDraft(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload

    fun close(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload

    fun archive(
        currentUserId: Long,
        opportunityId: Long
    ): EmployerOpportunityEditPayload
}
