package ru.itplanet.trampline.auth.model.response

import ru.itplanet.trampline.commons.model.Role
import java.time.Instant

data class CuratorDetailResponse(
    val id: Long,
    val displayName: String,
    val email: String,
    val role: Role,
    val twoFactorEnabled: Boolean,
    val lastLoginAt: Instant?,
    val isActive: Boolean,
    val deactivatedAt: Instant?,
    val deactivatedByUserId: Long?,
    val deactivationReason: String?,
    val stats: CuratorModerationStatsResponse,
)
