package ru.itplanet.trampline.auth.service

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.SessionProperties
import java.time.Duration

@Service
class SessionCookieService(
    private val sessionProperties: SessionProperties
) {

    fun resolveSessionId(request: HttpServletRequest): String? {
        return request.cookies
            ?.firstOrNull { it.name == sessionProperties.cookieName }
            ?.value
    }

    fun writeSessionCookie(
        response: HttpServletResponse,
        sessionId: String
    ) {
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            buildCookie(
                value = sessionId,
                maxAge = Duration.ofSeconds(sessionProperties.ttlSeconds)
            ).toString()
        )
    }

    fun clearSessionCookie(response: HttpServletResponse) {
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            buildCookie(
                value = "",
                maxAge = Duration.ZERO
            ).toString()
        )
    }

    private fun buildCookie(
        value: String,
        maxAge: Duration
    ): ResponseCookie {
        return ResponseCookie
            .from(sessionProperties.cookieName, value)
            .httpOnly(true)
            .secure(sessionProperties.secureCookie)
            .sameSite(sessionProperties.sameSite)
            .path("/")
            .maxAge(maxAge)
            .build()
    }
}
