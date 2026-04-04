package ru.itplanet.trampline.auth.model.response

import java.time.OffsetDateTime

data class CuratorModerationStatsResponse(
    val openAssignedCount: Long = 0,
    val inProgressCount: Long = 0,
    val approvedCount: Long = 0,
    val rejectedCount: Long = 0,
    val cancelledCount: Long = 0,
    val lastModerationActionAt: OffsetDateTime? = null,
)
