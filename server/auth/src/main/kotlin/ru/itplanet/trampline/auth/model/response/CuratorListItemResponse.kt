package ru.itplanet.trampline.auth.model.response

import ru.itplanet.trampline.commons.model.Role
import java.time.Instant

data class CuratorListItemResponse(
    val id: Long,
    val displayName: String,
    val email: String,
    val twoFactorEnabled: Boolean,
    val lastLoginAt: Instant?,
    val role: Role,
    val isActive: Boolean,
)
