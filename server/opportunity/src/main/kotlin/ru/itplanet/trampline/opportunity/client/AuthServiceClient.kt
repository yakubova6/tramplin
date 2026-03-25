package ru.itplanet.trampline.opportunity.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import ru.itplanet.trampline.opportunity.model.auth.AuthCurrentSessionResponse

@FeignClient(
    name = "opportunity-auth-service-client",
    url = "\${auth.service.url}",
    configuration = [AuthServiceFeignConfig::class]
)
interface AuthServiceClient {

    @GetMapping("/api/auth/me")
    fun me(): AuthCurrentSessionResponse
}
