package ru.itplanet.trampline.auth.model

import java.util.UUID

data class User(
    val id: UUID,
    val username: String,
    val email: String
)