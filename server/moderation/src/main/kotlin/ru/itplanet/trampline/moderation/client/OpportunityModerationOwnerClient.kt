package ru.itplanet.trampline.moderation.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest

@FeignClient(
    name = "moderation-opportunity-owner-client",
    url = "\${opportunity.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface OpportunityModerationOwnerClient {

    @PostMapping("/internal/moderation/opportunities/{opportunityId}/approve")
    fun approveOpportunity(
        @PathVariable opportunityId: Long,
        @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/opportunities/{opportunityId}/reject")
    fun rejectOpportunity(
        @PathVariable opportunityId: Long,
        @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/opportunities/{opportunityId}/request-changes")
    fun requestChangesOpportunity(
        @PathVariable opportunityId: Long,
        @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/tags/{tagId}/approve")
    fun approveTag(
        @PathVariable tagId: Long,
        @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/tags/{tagId}/reject")
    fun rejectTag(
        @PathVariable tagId: Long,
        @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/tags/{tagId}/request-changes")
    fun requestChangesTag(
        @PathVariable tagId: Long,
        @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse
}
