package ru.itplanet.trampline.auth.service

import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.PasswordResetConfirmRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetVerifyRequest
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.model.response.CurrentSessionResponse
import ru.itplanet.trampline.auth.model.response.PasswordResetVerifyResponse
import ru.itplanet.trampline.commons.model.TokenPayload

interface AuthService {
    fun register(request: Registration): AuthResponse
    fun login(request: Authorization): AuthResponse
    fun requestPasswordReset(request: PasswordResetRequest)
    fun verifyPasswordResetCode(request: PasswordResetVerifyRequest): PasswordResetVerifyResponse
    fun confirmPasswordReset(request: PasswordResetConfirmRequest)
    fun validateSession(sessionId: String?): TokenPayload
    fun getCurrentSession(sessionId: String?): CurrentSessionResponse
    fun logout(sessionId: String?)
}
