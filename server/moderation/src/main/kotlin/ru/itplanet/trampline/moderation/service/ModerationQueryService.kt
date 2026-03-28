package ru.itplanet.trampline.moderation.service

import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
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
        request: GetModerationTasksRequest,
    ): ModerationTaskPageResponse

    fun getTask(
        taskId: Long,
        currentUser: AuthenticatedUser,
    ): ModerationTaskDetailResponse

    fun getEntityAttachments(
        entityType: FileAttachmentEntityType,
        entityId: Long,
        currentUser: AuthenticatedUser,
    ): List<InternalFileAttachmentResponse>

    fun getTaskAttachmentDownloadUrl(
        taskId: Long,
        currentUser: AuthenticatedUser,
        fileId: Long,
    ): InternalFileDownloadUrlResponse

    fun getEntityHistory(
        entityType: ModerationEntityType,
        entityId: Long,
    ): List<ModerationEntityHistoryItemResponse>

    fun findActiveTaskByEntity(
        entityType: ModerationEntityType,
        entityId: Long,
        taskType: ModerationTaskType,
    ): InternalModerationTaskLookupResponse
}
