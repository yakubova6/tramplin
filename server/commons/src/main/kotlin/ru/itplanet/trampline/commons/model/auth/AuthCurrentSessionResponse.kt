package ru.itplanet.trampline.commons.model.auth

import ru.itplanet.trampline.commons.model.Role

data class AuthCurrentSessionResponse(
    val user: AuthUserResponse,
    val session: AuthSessionInfoResponse
)

data class AuthUserResponse(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
)

data class AuthSessionInfoResponse(
    val created: java.time.Instant,
    val expires: java.time.Instant
)
