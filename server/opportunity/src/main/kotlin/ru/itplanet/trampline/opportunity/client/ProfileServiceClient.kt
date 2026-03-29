package ru.itplanet.trampline.opportunity.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse

@FeignClient(
    name = "opportunity-profile-service-client",
    url = "\${profile.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface ProfileServiceClient {

    @GetMapping("/internal/employer-profiles/{employerUserId}/opportunity-access")
    fun getEmployerOpportunityAccess(
        @PathVariable employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse
}
