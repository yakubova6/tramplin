package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.opportunity.model.OpportunityCard
import ru.itplanet.trampline.opportunity.model.OpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityMapPoint
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.request.GetOpportunityListRequest
import ru.itplanet.trampline.opportunity.service.OpportunityService

@Validated
@RestController
@RequestMapping("/api/opportunities")
class OpportunityController(
    private val opportunityService: OpportunityService
) {

    @GetMapping
    fun getPublicCatalog(
        @Valid @ModelAttribute request: GetOpportunityListRequest
    ): OpportunityPage<OpportunityListItem> {
        return opportunityService.getPublicCatalog(request)
    }

    @GetMapping("/map")
    fun getPublicMap(
        @Valid @ModelAttribute request: GetOpportunityListRequest
    ): OpportunityPage<OpportunityMapPoint> {
        return opportunityService.getPublicMap(request)
    }

    @GetMapping("/{id}")
    fun getPublicOpportunity(
        @PathVariable @Positive id: Long
    ): OpportunityCard {
        return opportunityService.getPublicOpportunity(id)
    }
}
