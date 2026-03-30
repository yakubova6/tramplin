package ru.itplanet.trampline.auth.model.response

import java.time.Instant

data class PasswordResetVerifyResponse(
    val resetToken: String,
    val expiresAt: Instant
)
