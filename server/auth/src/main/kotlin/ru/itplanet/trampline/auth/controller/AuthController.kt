package ru.itplanet.trampline.auth.controller

import jakarta.validation.Valid
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import ru.itplanet.trampline.auth.model.TokenPayload
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.service.AuthService

@Validated
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: Registration
    ): AuthResponse {
        return authService.register(request)
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: Authorization
    ): AuthResponse {
        return authService.login(request)
    }

    @GetMapping("/validateSession")
    fun validateSession(
        @CookieValue(
            name = "sessionId",
            required = false
        ) sessionId: String?
    ): TokenPayload {
        return authService.validateSession(sessionId)
    }
}