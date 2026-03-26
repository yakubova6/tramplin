package ru.itplanet.trampline.moderation.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.moderation.model.request.GetModerationTasksRequest
import ru.itplanet.trampline.moderation.model.response.ModerationDashboardResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskDetailResponse
import ru.itplanet.trampline.moderation.model.response.ModerationTaskPageResponse
import ru.itplanet.trampline.moderation.security.AuthenticatedUser
import ru.itplanet.trampline.moderation.service.ModerationQueryService

@Validated
@RestController
@RequestMapping("/api/moderation")
class ModerationController(
    private val moderationQueryService: ModerationQueryService
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
}
