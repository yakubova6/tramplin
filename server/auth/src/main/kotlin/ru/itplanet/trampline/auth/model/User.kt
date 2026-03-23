package ru.itplanet.trampline.auth.model

import java.util.UUID

data class User(
    val id: UUID,
    val displayName: String,
    val email: String,
    val role: Role,
    val status: Status
)