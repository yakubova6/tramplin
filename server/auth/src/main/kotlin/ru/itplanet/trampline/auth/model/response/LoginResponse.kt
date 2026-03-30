package ru.itplanet.trampline.auth.model.response

import ru.itplanet.trampline.auth.model.User
import java.time.Instant

data class LoginResponse(
    val requiresTwoFactor: Boolean,
    val pendingToken: String? = null,
    val pendingTokenExpiresAt: Instant? = null,
    val sessionId: String? = null,
    val user: User? = null
)
