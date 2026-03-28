package ru.itplanet.trampline.moderation.service

import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskResponse
import ru.itplanet.trampline.moderation.model.request.ApproveModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.AssignModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CommentModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CreateManualModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.RejectModerationTaskRequest
import ru.itplanet.trampline.moderation.security.AuthenticatedUser

interface ModerationCommandService {

    fun createInternalTask(
        request: CreateInternalModerationTaskRequest,
    ): InternalModerationTaskResponse

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

    fun addAttachment(
        taskId: Long,
        currentUser: AuthenticatedUser,
        file: MultipartFile,
    )

    fun cancel(
        taskId: Long,
        currentUser: AuthenticatedUser,
    )

    fun cancelByInternal(taskId: Long)
}
