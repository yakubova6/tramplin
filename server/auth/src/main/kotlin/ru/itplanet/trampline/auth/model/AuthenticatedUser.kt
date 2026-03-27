package ru.itplanet.trampline.auth.model

import ru.itplanet.trampline.commons.model.Role

data class AuthenticatedUser(
    val userId: Long,
    val email: String,
    val role: Role,
)
