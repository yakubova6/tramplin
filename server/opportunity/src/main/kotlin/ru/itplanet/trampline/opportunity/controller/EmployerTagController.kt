package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest
import ru.itplanet.trampline.opportunity.service.EmployerTagService

@Validated
@RestController
@RequestMapping("/api/employer/tags")
class EmployerTagController(
    private val employerTagService: EmployerTagService,
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @CurrentUser currentUserId: Long,
        @Valid @RequestBody request: CreateEmployerTagRequest,
    ): EmployerTagResponse {
        return employerTagService.create(currentUserId, request)
    }

    @GetMapping("/{id}/moderation-task")
    fun getModerationTask(
        @CurrentUser currentUserId: Long,
        @PathVariable @Positive id: Long,
    ): InternalModerationTaskLookupResponse {
        return employerTagService.getModerationTask(currentUserId, id)
    }

    @PostMapping("/{id}/moderation-task/cancel")
    fun cancelModerationTask(
        @CurrentUser currentUserId: Long,
        @PathVariable @Positive id: Long,
    ): ResponseEntity<Unit> {
        employerTagService.cancelModerationTask(currentUserId, id)
        return ResponseEntity.noContent().build()
    }
}
