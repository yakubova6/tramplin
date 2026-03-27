package ru.itplanet.trampline.moderation.service

import ru.itplanet.trampline.moderation.model.request.ApproveModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.AssignModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CommentModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CreateManualModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.RejectModerationTaskRequest
import ru.itplanet.trampline.moderation.security.AuthenticatedUser

interface ModerationCommandService {

    fun createManualTask(
        currentUser: AuthenticatedUser,
        request: CreateManualModerationTaskRequest,
    ): Long

    fun assign(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: AssignModerationTaskRequest,
    )

    fun approve(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: ApproveModerationTaskRequest,
    )

    fun reject(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: RejectModerationTaskRequest,
    )

    fun comment(
        taskId: Long,
        currentUser: AuthenticatedUser,
        request: CommentModerationTaskRequest,
    )

    fun cancel(
        taskId: Long,
        currentUser: AuthenticatedUser,
    )

    fun cancelByInternal(taskId: Long)
}
