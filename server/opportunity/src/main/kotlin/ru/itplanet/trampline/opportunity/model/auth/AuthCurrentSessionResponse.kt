package ru.itplanet.trampline.opportunity.model.auth

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.Status

data class AuthCurrentSessionResponse(
    val user: AuthUserResponse,
    val session: AuthSessionInfoResponse
)

data class AuthUserResponse(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
    val status: Status
)

data class AuthSessionInfoResponse(
    val created: java.time.Instant,
    val expires: java.time.Instant
)
