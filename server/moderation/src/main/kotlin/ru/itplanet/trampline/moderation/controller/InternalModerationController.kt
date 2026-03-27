package ru.itplanet.trampline.moderation.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskResponse
import ru.itplanet.trampline.moderation.service.ModerationCommandService

@Validated
@RestController
@RequestMapping("/internal/moderation")
class InternalModerationController(
    private val moderationCommandService: ModerationCommandService,
) {

    @PostMapping("/tasks")
    fun createTask(
        @Valid @RequestBody request: CreateInternalModerationTaskRequest,
    ): ResponseEntity<InternalModerationTaskResponse> {
        val response = moderationCommandService.createInternalTask(request)
        val status = if (response.created) HttpStatus.CREATED else HttpStatus.OK
        return ResponseEntity.status(status).body(response)
    }

    @PostMapping("/tasks/{taskId}/cancel")
    fun cancelTask(
        @PathVariable @Positive taskId: Long,
    ): ResponseEntity<Unit> {
        moderationCommandService.cancelByInternal(taskId)
        return ResponseEntity.noContent().build()
    }
}
