package ru.itplanet.trampline.profile.controller

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
import ru.itplanet.trampline.profile.service.InternalProfileModerationService

@Validated
@RestController
@RequestMapping("/internal/moderation")
class InternalProfileModerationController(
    private val internalProfileModerationService: InternalProfileModerationService,
) {

    @PostMapping("/employer-profiles/{userId}/approve")
    fun approveEmployerProfile(
        @PathVariable @Positive userId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.approveEmployerProfile(userId, request)
    }

    @PostMapping("/employer-profiles/{userId}/reject")
    fun rejectEmployerProfile(
        @PathVariable @Positive userId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.rejectEmployerProfile(userId, request)
    }

    @PostMapping("/employer-verifications/{verificationId}/approve")
    fun approveEmployerVerification(
        @PathVariable @Positive verificationId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.approveEmployerVerification(verificationId, request)
    }

    @PostMapping("/employer-verifications/{verificationId}/reject")
    fun rejectEmployerVerification(
        @PathVariable @Positive verificationId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.rejectEmployerVerification(verificationId, request)
    }
}
