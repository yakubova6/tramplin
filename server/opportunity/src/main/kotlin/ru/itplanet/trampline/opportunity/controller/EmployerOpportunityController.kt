package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityCard
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityEditPayload
import ru.itplanet.trampline.opportunity.model.EmployerOpportunityListItem
import ru.itplanet.trampline.opportunity.model.OpportunityPage
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerOpportunityRequest
import ru.itplanet.trampline.opportunity.model.request.GetEmployerOpportunityListRequest
import ru.itplanet.trampline.opportunity.service.EmployerOpportunityMediaService
import ru.itplanet.trampline.opportunity.service.EmployerOpportunityModerationService
import ru.itplanet.trampline.opportunity.service.EmployerOpportunityService

@Validated
@RestController
@RequestMapping("/api/employer/opportunities")
class EmployerOpportunityController(
    private val employerOpportunityService: EmployerOpportunityService,
    private val employerOpportunityModerationService: EmployerOpportunityModerationService,
    private val employerOpportunityMediaService: EmployerOpportunityMediaService,
) {

    @PostMapping
    fun create(
        @Valid @RequestBody request: CreateEmployerOpportunityRequest,
        @CurrentUser currentUserId: Long,
    ): EmployerOpportunityCard {
        return employerOpportunityModerationService.create(currentUserId, request)
    }

    @GetMapping
    fun getMyOpportunities(
        @Valid @ModelAttribute request: GetEmployerOpportunityListRequest,
        @CurrentUser currentUserId: Long,
    ): OpportunityPage<EmployerOpportunityListItem> {
        return employerOpportunityService.getMyOpportunities(currentUserId, request)
    }

    @GetMapping("/{id}")
    fun getMyOpportunity(
        @PathVariable @Positive id: Long,
        @CurrentUser currentUserId: Long,
    ): EmployerOpportunityEditPayload {
        return employerOpportunityService.getMyOpportunity(currentUserId, id)
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable @Positive id: Long,
        @Valid @RequestBody request: CreateEmployerOpportunityRequest,
        @CurrentUser currentUserId: Long,
    ): EmployerOpportunityEditPayload {
        return employerOpportunityService.update(currentUserId, id, request)
    }

    @PostMapping(
        value = ["/{id}/media"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun uploadMedia(
        @PathVariable @Positive id: Long,
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUserId: Long,
    ): List<InternalFileAttachmentResponse> {
        return employerOpportunityMediaService.addMedia(currentUserId, id, file)
    }

    @DeleteMapping("/{id}/media/{attachmentId}")
    fun deleteMedia(
        @PathVariable @Positive id: Long,
        @PathVariable @Positive attachmentId: Long,
        @CurrentUser currentUserId: Long,
    ): List<InternalFileAttachmentResponse> {
        return employerOpportunityMediaService.deleteMedia(currentUserId, id, attachmentId)
    }

    @PostMapping("/{id}/return-to-draft")
    fun returnToDraft(
        @PathVariable @Positive id: Long,
        @CurrentUser currentUserId: Long,
    ): EmployerOpportunityEditPayload {
        return employerOpportunityService.returnToDraft(currentUserId, id)
    }

    @PostMapping("/{id}/close")
    fun close(
        @PathVariable @Positive id: Long,
        @CurrentUser currentUserId: Long,
    ): EmployerOpportunityEditPayload {
        return employerOpportunityService.close(currentUserId, id)
    }

    @PostMapping("/{id}/archive")
    fun archive(
        @PathVariable @Positive id: Long,
        @CurrentUser currentUserId: Long,
    ): EmployerOpportunityEditPayload {
        return employerOpportunityService.archive(currentUserId, id)
    }

    @GetMapping("/{id}/moderation-task")
    fun getModerationTask(
        @PathVariable @Positive id: Long,
        @CurrentUser currentUserId: Long,
    ): InternalModerationTaskLookupResponse {
        return employerOpportunityModerationService.getModerationTask(currentUserId, id)
    }

    @PostMapping("/{id}/moderation-task/cancel")
    fun cancelModerationTask(
        @PathVariable @Positive id: Long,
        @CurrentUser currentUserId: Long,
    ): ResponseEntity<Unit> {
        employerOpportunityModerationService.cancelModerationTask(currentUserId, id)
        return ResponseEntity.noContent().build()
    }
}
