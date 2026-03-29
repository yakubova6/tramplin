package ru.itplanet.trampline.profile.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestParam
import ru.itplanet.trampline.profile.model.ApplicantApplicationSummary
import ru.itplanet.trampline.profile.model.ApplicantContactSummary

@FeignClient(
    name = "profile-interaction-privacy-client",
    url = "\${interaction.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface InteractionPrivacyClient {

    @GetMapping("/internal/applicants/{userId}/contacts")
    fun getApplicantContacts(
        @PathVariable userId: Long,
    ): List<ApplicantContactSummary>

    @GetMapping("/internal/applicants/{userId}/applications")
    fun getApplicantApplications(
        @PathVariable userId: Long,
    ): List<ApplicantApplicationSummary>

    @GetMapping("/internal/applicants/contacts/accepted")
    fun isAcceptedContact(
        @RequestParam firstUserId: Long,
        @RequestParam secondUserId: Long,
    ): InternalApplicantContactRelationResponse
}

data class InternalApplicantContactRelationResponse(
    val accepted: Boolean,
)
