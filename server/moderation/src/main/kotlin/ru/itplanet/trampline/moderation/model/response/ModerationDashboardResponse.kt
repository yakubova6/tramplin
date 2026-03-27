package ru.itplanet.trampline.moderation.model.response

import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority

data class ModerationDashboardResponse(
    val openCount: Long,
    val inProgressCount: Long,
    val myInProgressCount: Long,
    val countsByEntityType: Map<ModerationEntityType, Long>,
    val countsByPriority: Map<ModerationTaskPriority, Long>
)
