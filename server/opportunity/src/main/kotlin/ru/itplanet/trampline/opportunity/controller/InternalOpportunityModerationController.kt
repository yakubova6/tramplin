package ru.itplanet.trampline.opportunity.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest
import ru.itplanet.trampline.opportunity.service.InternalOpportunityModerationService

@Validated
@RestController
@RequestMapping("/internal/moderation")
class InternalOpportunityModerationController(
    private val internalOpportunityModerationService: InternalOpportunityModerationService,
) {

    @PostMapping("/opportunities/{opportunityId}/approve")
    fun approveOpportunity(
        @PathVariable @Positive(message = "Идентификатор возможности должен быть положительным") opportunityId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalOpportunityModerationService.approveOpportunity(opportunityId, request)
    }

    @PostMapping("/opportunities/{opportunityId}/reject")
    fun rejectOpportunity(
        @PathVariable @Positive(message = "Идентификатор возможности должен быть положительным") opportunityId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalOpportunityModerationService.rejectOpportunity(opportunityId, request)
    }

    @PostMapping("/opportunities/{opportunityId}/request-changes")
    fun requestChangesOpportunity(
        @PathVariable @Positive(message = "Идентификатор возможности должен быть положительным") opportunityId: Long,
        @Valid @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        return internalOpportunityModerationService.requestChangesOpportunity(opportunityId, request)
    }

    @PostMapping("/tags/{tagId}/approve")
    fun approveTag(
        @PathVariable @Positive(message = "Идентификатор тега должен быть положительным") tagId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalOpportunityModerationService.approveTag(tagId, request)
    }

    @PostMapping("/tags/{tagId}/reject")
    fun rejectTag(
        @PathVariable @Positive(message = "Идентификатор тега должен быть положительным") tagId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalOpportunityModerationService.rejectTag(tagId, request)
    }

    @PostMapping("/tags/{tagId}/request-changes")
    fun requestChangesTag(
        @PathVariable @Positive(message = "Идентификатор тега должен быть положительным") tagId: Long,
        @Valid @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        return internalOpportunityModerationService.requestChangesTag(tagId, request)
    }
}
