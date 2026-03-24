package ru.itplanet.trampline.profile.connector

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import ru.itplanet.trampline.commons.model.TokenPayload


@FeignClient(name = "auth-service", url = "\${auth.service.url:http://localhost:9999/api/auth}")
interface AuthConnector {

    @GetMapping("/validateSession")
    fun validateSession(
        @CookieValue("sessionId") sessionId: String
    ): TokenPayload
}