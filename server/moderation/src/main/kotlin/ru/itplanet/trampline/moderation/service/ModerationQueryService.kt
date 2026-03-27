package ru.itplanet.trampline.moderation.service

import ru.itplanet.trampline.moderation.model.ModerationEntityType
import ru.itplanet.trampline.moderation.model.request.GetModerationTasksRequest
import ru.itplanet.trampline.moderation.model.response.ModerationDashboardResponse
import ru.itplanet.trampline.moderation.model.response.ModerationEntityHistoryItemResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskDetailResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskPageResponse
import ru.itplanet.trampline.moderation.security.AuthenticatedUser

interface ModerationQueryService {

    fun getDashboard(currentUser: AuthenticatedUser): ModerationDashboardResponse

    fun getTasks(
        currentUser: AuthenticatedUser,
        request: GetModerationTasksRequest
    ): ModerationTaskPageResponse

    fun getTask(
        taskId: Long,
        currentUser: AuthenticatedUser
    ): ModerationTaskDetailResponse

    fun getEntityHistory(
        entityType: ModerationEntityType,
        entityId: Long
    ): List<ModerationEntityHistoryItemResponse>
}
