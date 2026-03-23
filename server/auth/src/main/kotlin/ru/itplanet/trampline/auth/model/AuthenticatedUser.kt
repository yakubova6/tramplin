package ru.itplanet.trampline.auth.model

data class AuthenticatedUser(
    val userId: Long,
    val email: String,
    val role: Role,
    val status: Status
)
