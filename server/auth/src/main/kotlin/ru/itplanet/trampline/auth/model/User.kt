package ru.itplanet.trampline.auth.model

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.Status

data class User(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
    val status: Status
)