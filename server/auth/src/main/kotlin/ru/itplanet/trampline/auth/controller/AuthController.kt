package ru.itplanet.trampline.auth.controller

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.auth.model.AuthenticatedUser
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.PasswordResetConfirmRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetVerifyRequest
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.request.TwoFactorConfirmRequest
import ru.itplanet.trampline.auth.model.request.TwoFactorPasswordRequest
import ru.itplanet.trampline.auth.model.request.TwoFactorResendRequest
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.model.response.CsrfResponse
import ru.itplanet.trampline.auth.model.response.CurrentSessionResponse
import ru.itplanet.trampline.auth.model.response.LoginResponse
import ru.itplanet.trampline.auth.model.response.PasswordResetVerifyResponse
import ru.itplanet.trampline.auth.model.response.TwoFactorChallengeResponse
import ru.itplanet.trampline.auth.service.AuthService
import ru.itplanet.trampline.auth.service.SessionCookieService
import ru.itplanet.trampline.commons.model.TokenPayload

@Validated
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val sessionCookieService: SessionCookieService
) {

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: Registration,
        response: HttpServletResponse
    ): AuthResponse {
        val authResponse = authService.register(request)
        sessionCookieService.writeSessionCookie(response, authResponse.sessionId)
        return authResponse
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: Authorization,
        response: HttpServletResponse
    ): LoginResponse {
        val loginResponse = authService.login(request)

        loginResponse.sessionId
            ?.takeIf { it.isNotBlank() }
            ?.let { sessionCookieService.writeSessionCookie(response, it) }

        return loginResponse
    }

    @PostMapping("/2fa/login/verify")
    fun verifyLoginTwoFactor(
        @Valid @RequestBody request: TwoFactorConfirmRequest,
        response: HttpServletResponse
    ): AuthResponse {
        val authResponse = authService.verifyLoginTwoFactor(request)
        sessionCookieService.writeSessionCookie(response, authResponse.sessionId)
        return authResponse
    }

    @PostMapping("/2fa/login/resend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun resendLoginTwoFactorCode(
        @Valid @RequestBody request: TwoFactorResendRequest
    ) {
        authService.resendLoginTwoFactorCode(request)
    }

    @PostMapping("/2fa/enable/request")
    fun requestEnableTwoFactor(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: TwoFactorPasswordRequest
    ): TwoFactorChallengeResponse {
        return authService.requestEnableTwoFactor(principal.userId, request)
    }

    @PostMapping("/2fa/enable/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun confirmEnableTwoFactor(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: TwoFactorConfirmRequest
    ) {
        authService.confirmEnableTwoFactor(principal.userId, request)
    }

    @PostMapping("/2fa/disable/request")
    fun requestDisableTwoFactor(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: TwoFactorPasswordRequest
    ): TwoFactorChallengeResponse {
        return authService.requestDisableTwoFactor(principal.userId, request)
    }

    @PostMapping("/2fa/disable/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun confirmDisableTwoFactor(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: TwoFactorConfirmRequest
    ) {
        authService.confirmDisableTwoFactor(principal.userId, request)
    }

    @PostMapping("/password-reset/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun requestPasswordReset(
        @Valid @RequestBody request: PasswordResetRequest
    ) {
        authService.requestPasswordReset(request)
    }

    @PostMapping("/password-reset/verify")
    fun verifyPasswordResetCode(
        @Valid @RequestBody request: PasswordResetVerifyRequest
    ): PasswordResetVerifyResponse {
        return authService.verifyPasswordResetCode(request)
    }

    @PostMapping("/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun confirmPasswordReset(
        @Valid @RequestBody request: PasswordResetConfirmRequest
    ) {
        authService.confirmPasswordReset(request)
    }

    @GetMapping("/validateSession")
    fun validateSession(
        request: HttpServletRequest,
        response: HttpServletResponse
    ): TokenPayload {
        val sessionId = sessionCookieService.resolveSessionId(request)
        val tokenPayload = authService.validateSession(sessionId)

        sessionId
            ?.takeIf { it.isNotBlank() }
            ?.let { sessionCookieService.writeSessionCookie(response, it) }

        return tokenPayload
    }

    @GetMapping("/me")
    fun me(
        request: HttpServletRequest,
        response: HttpServletResponse
    ): CurrentSessionResponse {
        val sessionId = sessionCookieService.resolveSessionId(request)
        val currentSession = authService.getCurrentSession(sessionId)

        sessionId
            ?.takeIf { it.isNotBlank() }
            ?.let { sessionCookieService.writeSessionCookie(response, it) }

        return currentSession
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse
    ) {
        val sessionId = sessionCookieService.resolveSessionId(request)
        authService.logout(sessionId)
        sessionCookieService.clearSessionCookie(response)
    }

    @GetMapping("/csrf")
    fun csrf(csrfToken: CsrfToken): CsrfResponse {
        return CsrfResponse(
            headerName = csrfToken.headerName,
            token = csrfToken.token
        )
    }
}
