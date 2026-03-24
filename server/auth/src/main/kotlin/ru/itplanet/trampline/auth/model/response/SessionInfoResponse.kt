package ru.itplanet.trampline.auth.model.response

import java.time.Instant

data class SessionInfoResponse(
    val created: Instant,
    val expires: Instant
)
