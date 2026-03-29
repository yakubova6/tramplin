package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse
import ru.itplanet.trampline.profile.service.EmployerOpportunityAccessService

@Validated
@RestController
@RequestMapping("/internal/employer-profiles")
class InternalEmployerOpportunityAccessController(
    private val employerOpportunityAccessService: EmployerOpportunityAccessService,
) {

    @GetMapping("/{employerUserId}/opportunity-access")
    fun getEmployerOpportunityAccess(
        @PathVariable @Positive employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse {
        return employerOpportunityAccessService.getEmployerOpportunityAccess(employerUserId)
    }
}
