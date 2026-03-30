package ru.itplanet.trampline.auth.model

import ru.itplanet.trampline.commons.model.Role

data class User(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
    val twoFactorEnabled: Boolean = false,
)
