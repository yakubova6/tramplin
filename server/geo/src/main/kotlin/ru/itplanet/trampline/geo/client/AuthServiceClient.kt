package ru.itplanet.trampline.geo.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import ru.itplanet.trampline.commons.model.auth.AuthCurrentSessionResponse


@FeignClient(
    name = "interaction-auth-service-client",
    url = "\${auth.service.url}",
    configuration = [ServiceFeignConfig::class]
)
interface AuthServiceClient {

    @GetMapping("/api/auth/me")
    fun me(): AuthCurrentSessionResponse
}