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
    name = "moderation-profile-owner-client",
    url = "\${profile.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface ProfileModerationOwnerClient {

    @PostMapping("/internal/moderation/applicant-profiles/{userId}/approve")
    fun approveApplicantProfile(
        @PathVariable userId: Long,
        @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/applicant-profiles/{userId}/reject")
    fun rejectApplicantProfile(
        @PathVariable userId: Long,
        @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/applicant-profiles/{userId}/request-changes")
    fun requestChangesApplicantProfile(
        @PathVariable userId: Long,
        @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/employer-profiles/{userId}/approve")
    fun approveEmployerProfile(
        @PathVariable userId: Long,
        @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/employer-profiles/{userId}/reject")
    fun rejectEmployerProfile(
        @PathVariable userId: Long,
        @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/employer-profiles/{userId}/request-changes")
    fun requestChangesEmployerProfile(
        @PathVariable userId: Long,
        @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/employer-verifications/{verificationId}/approve")
    fun approveEmployerVerification(
        @PathVariable verificationId: Long,
        @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/employer-verifications/{verificationId}/reject")
    fun rejectEmployerVerification(
        @PathVariable verificationId: Long,
        @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse

    @PostMapping("/internal/moderation/employer-verifications/{verificationId}/request-changes")
    fun requestChangesEmployerVerification(
        @PathVariable verificationId: Long,
        @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse
}
