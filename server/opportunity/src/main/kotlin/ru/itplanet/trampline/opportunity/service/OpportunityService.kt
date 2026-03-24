package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.opportunity.model.OpportunityCard
import ru.itplanet.trampline.opportunity.model.OpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityMapPoint
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.request.GetOpportunityListRequest

interface OpportunityService {

    fun getPublicCatalog(request: GetOpportunityListRequest): OpportunityPage<OpportunityListItem>

    fun getPublicMap(request: GetOpportunityListRequest): OpportunityPage<OpportunityMapPoint>

    fun getPublicOpportunity(id: Long): OpportunityCard
}
