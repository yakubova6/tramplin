package ru.itplanet.trampline.auth.controller

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.auth.config.SessionProperties
import ru.itplanet.trampline.auth.model.TokenPayload
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.service.AuthService
import java.time.Duration

@Validated
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val sessionProperties: SessionProperties
) {

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: Registration,
        response: HttpServletResponse
    ): AuthResponse {
        val authResponse = authService.register(request)
        writeSessionCookie(response, authResponse.sessionId)
        return authResponse
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: Authorization,
        response: HttpServletResponse
    ): AuthResponse {
        val authResponse = authService.login(request)
        writeSessionCookie(response, authResponse.sessionId)
        return authResponse
    }

    @GetMapping("/validateSession")
    fun validateSession(
        request: HttpServletRequest,
        response: HttpServletResponse
    ): TokenPayload {
        val sessionId = resolveSessionId(request)
        val tokenPayload = authService.validateSession(sessionId)

        if (!sessionId.isNullOrBlank()) {
            writeSessionCookie(response, sessionId)
        }

        return tokenPayload
    }

    private fun resolveSessionId(request: HttpServletRequest): String? {
        return request.cookies
            ?.firstOrNull { it.name == sessionProperties.cookieName }
            ?.value
    }

    private fun writeSessionCookie(
        response: HttpServletResponse,
        sessionId: String
    ) {
        val cookie = ResponseCookie
            .from(sessionProperties.cookieName, sessionId)
            .httpOnly(true)
            .secure(sessionProperties.secureCookie)
            .sameSite(sessionProperties.sameSite)
            .path("/")
            .maxAge(Duration.ofSeconds(sessionProperties.ttlSeconds))
            .build()

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }
}
