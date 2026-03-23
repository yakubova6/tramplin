package ru.itplanet.trampline.auth.model

data class User(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
    val status: Status
)