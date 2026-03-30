package ru.itplanet.trampline.auth.model.response

import java.time.Instant

data class TwoFactorChallengeResponse(
    val pendingToken: String,
    val expiresAt: Instant
)
