package ru.itplanet.trampline.interaction.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.interaction.model.response.InternalApplicantApplicationResponse
import ru.itplanet.trampline.interaction.model.response.InternalApplicantContactRelationResponse
import ru.itplanet.trampline.interaction.model.response.InternalApplicantContactResponse
import ru.itplanet.trampline.interaction.service.InteractionService

@RestController
@RequestMapping("/internal/applicants")
class InternalApplicantPrivacyController(
    private val interactionService: InteractionService,
) {

    @GetMapping("/{userId}/contacts")
    fun getApplicantContacts(
        @PathVariable userId: Long,
    ): List<InternalApplicantContactResponse> {
        return interactionService.getApplicantContactsForPrivacy(userId)
    }

    @GetMapping("/{userId}/applications")
    fun getApplicantApplications(
        @PathVariable userId: Long,
    ): List<InternalApplicantApplicationResponse> {
        return interactionService.getApplicantApplicationsForPrivacy(userId)
    }

    @GetMapping("/contacts/accepted")
    fun isAcceptedContact(
        @RequestParam firstUserId: Long,
        @RequestParam secondUserId: Long,
    ): InternalApplicantContactRelationResponse {
        return InternalApplicantContactRelationResponse(
            accepted = interactionService.isAcceptedContact(firstUserId, secondUserId),
        )
    }
}
