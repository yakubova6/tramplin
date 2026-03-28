package ru.itplanet.trampline.moderation.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.moderation.model.request.ApproveModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.AssignModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CommentModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CreateManualModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.GetModerationTasksRequest
import ru.itplanet.trampline.moderation.model.request.RejectModerationTaskRequest
import ru.itplanet.trampline.moderation.model.response.ModerationDashboardResponse
import ru.itplanet.trampline.moderation.model.response.ModerationEntityHistoryItemResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskDetailResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskPageResponse
import ru.itplanet.trampline.moderation.security.AuthenticatedUser
import ru.itplanet.trampline.moderation.service.ModerationCommandService
import ru.itplanet.trampline.moderation.service.ModerationQueryService

@Validated
@RestController
@RequestMapping("/api/moderation")
class ModerationController(
    private val moderationQueryService: ModerationQueryService,
    private val moderationCommandService: ModerationCommandService,
) {

    @GetMapping("/dashboard")
    fun getDashboard(
        @CurrentUser currentUser: AuthenticatedUser
    ): ModerationDashboardResponse {
        return moderationQueryService.getDashboard(currentUser)
    }

    @GetMapping("/tasks")
    fun getTasks(
        @Valid @ModelAttribute request: GetModerationTasksRequest,
        @CurrentUser currentUser: AuthenticatedUser
    ): ModerationTaskPageResponse {
        return moderationQueryService.getTasks(currentUser, request)
    }

    @GetMapping("/tasks/{taskId}")
    fun getTask(
        @PathVariable @Positive taskId: Long,
        @CurrentUser currentUser: AuthenticatedUser
    ): ModerationTaskDetailResponse {
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @PostMapping("/tasks/manual")
    fun createManualTask(
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: CreateManualModerationTaskRequest,
    ): ModerationTaskDetailResponse {
        val taskId = moderationCommandService.createManualTask(currentUser, request)
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @GetMapping("/entities/{entityType}/{entityId}/history")
    fun getEntityHistory(
        @PathVariable entityType: ModerationEntityType,
        @PathVariable @Positive entityId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<ModerationEntityHistoryItemResponse> {
        return moderationQueryService.getEntityHistory(entityType, entityId)
    }

    @PostMapping("/tasks/{taskId}/assign")
    fun assignTask(
        @PathVariable @Positive taskId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: AssignModerationTaskRequest,
    ): ModerationTaskDetailResponse {
        moderationCommandService.assign(taskId, currentUser, request)
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @PostMapping("/tasks/{taskId}/approve")
    fun approveTask(
        @PathVariable @Positive taskId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: ApproveModerationTaskRequest,
    ): ModerationTaskDetailResponse {
        moderationCommandService.approve(taskId, currentUser, request)
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @PostMapping("/tasks/{taskId}/reject")
    fun rejectTask(
        @PathVariable @Positive taskId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: RejectModerationTaskRequest,
    ): ModerationTaskDetailResponse {
        moderationCommandService.reject(taskId, currentUser, request)
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @PostMapping("/tasks/{taskId}/comment")
    fun commentTask(
        @PathVariable @Positive taskId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: CommentModerationTaskRequest,
    ): ModerationTaskDetailResponse {
        moderationCommandService.comment(taskId, currentUser, request)
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @PostMapping(
        value = ["/tasks/{taskId}/attachments"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun addTaskAttachment(
        @PathVariable @Positive taskId: Long,
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ModerationTaskDetailResponse {
        moderationCommandService.addAttachment(taskId, currentUser, file)
        return moderationQueryService.getTask(taskId, currentUser)
    }

    @PostMapping("/tasks/{taskId}/cancel")
    fun cancelTask(
        @PathVariable @Positive taskId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ModerationTaskDetailResponse {
        moderationCommandService.cancel(taskId, currentUser)
        return moderationQueryService.getTask(taskId, currentUser)
    }
}
