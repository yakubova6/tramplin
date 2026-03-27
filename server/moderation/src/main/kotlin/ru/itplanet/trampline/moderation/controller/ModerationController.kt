package ru.itplanet.trampline.moderation.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.moderation.model.request.ApproveModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.AssignModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.CommentModerationTaskRequest
import ru.itplanet.trampline.moderation.model.request.GetModerationTasksRequest
import ru.itplanet.trampline.moderation.model.request.RejectModerationTaskRequest
import ru.itplanet.trampline.moderation.model.response.ModerationDashboardResponse
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
}
