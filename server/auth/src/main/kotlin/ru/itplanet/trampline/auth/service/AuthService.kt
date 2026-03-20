package ru.itplanet.trampline.auth.service

import ru.itplanet.trampline.auth.model.TokenPayload
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.response.AuthResponse

interface AuthService {
    fun register(request: Authorization): AuthResponse
    fun login(request: Authorization): AuthResponse
    fun validateSession(sessionId: String?): TokenPayload
}