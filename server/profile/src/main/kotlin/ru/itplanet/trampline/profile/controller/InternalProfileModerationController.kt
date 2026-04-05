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
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest
import ru.itplanet.trampline.profile.service.InternalProfileModerationService

@Validated
@RestController
@RequestMapping("/internal/moderation")
class InternalProfileModerationController(
    private val internalProfileModerationService: InternalProfileModerationService,
) {

    @PostMapping("/applicant-profiles/{userId}/approve")
    fun approveApplicantProfile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.approveApplicantProfile(userId, request)
    }

    @PostMapping("/applicant-profiles/{userId}/reject")
    fun rejectApplicantProfile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.rejectApplicantProfile(userId, request)
    }

    @PostMapping("/applicant-profiles/{userId}/request-changes")
    fun requestChangesApplicantProfile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @Valid @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.requestChangesApplicantProfile(userId, request)
    }

    @PostMapping("/employer-profiles/{userId}/approve")
    fun approveEmployerProfile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.approveEmployerProfile(userId, request)
    }

    @PostMapping("/employer-profiles/{userId}/reject")
    fun rejectEmployerProfile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.rejectEmployerProfile(userId, request)
    }

    @PostMapping("/employer-profiles/{userId}/request-changes")
    fun requestChangesEmployerProfile(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
        @Valid @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.requestChangesEmployerProfile(userId, request)
    }

    @PostMapping("/employer-verifications/{verificationId}/approve")
    fun approveEmployerVerification(
        @PathVariable @Positive(message = "Идентификатор запроса на верификацию должен быть положительным") verificationId: Long,
        @Valid @RequestBody request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.approveEmployerVerification(verificationId, request)
    }

    @PostMapping("/employer-verifications/{verificationId}/reject")
    fun rejectEmployerVerification(
        @PathVariable @Positive(message = "Идентификатор запроса на верификацию должен быть положительным") verificationId: Long,
        @Valid @RequestBody request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.rejectEmployerVerification(verificationId, request)
    }

    @PostMapping("/employer-verifications/{verificationId}/request-changes")
    fun requestChangesEmployerVerification(
        @PathVariable @Positive(message = "Идентификатор запроса на верификацию должен быть положительным") verificationId: Long,
        @Valid @RequestBody request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        return internalProfileModerationService.requestChangesEmployerVerification(verificationId, request)
    }
}
