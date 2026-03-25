package ru.itplanet.trampline.profile.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import ru.itplanet.trampline.commons.model.auth.AuthCurrentSessionResponse


@FeignClient(
    name = "profile-auth-service-client",
    url = "\${auth.service.url}",
    configuration = [AuthServiceFeignConfig::class]
)
interface AuthServiceClient {

    @GetMapping("/api/auth/me")
    fun me(): AuthCurrentSessionResponse
}