package ru.itplanet.trampline.interaction.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.interaction.model.response.InternalApplicantApplicationResponse
import ru.itplanet.trampline.interaction.model.response.InternalApplicantContactRelationResponse
import ru.itplanet.trampline.interaction.model.response.InternalApplicantContactResponse
import ru.itplanet.trampline.interaction.model.response.InternalEmployerApplicantProfileAccessResponse
import ru.itplanet.trampline.interaction.service.InteractionService

@Validated
@RestController
@RequestMapping("/internal/applicants")
class InternalApplicantPrivacyController(
    private val interactionService: InteractionService,
) {

    @GetMapping("/{userId}/contacts")
    fun getApplicantContacts(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): List<InternalApplicantContactResponse> {
        return interactionService.getApplicantContactsForPrivacy(userId)
    }

    @GetMapping("/{userId}/applications")
    fun getApplicantApplications(
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): List<InternalApplicantApplicationResponse> {
        return interactionService.getApplicantApplicationsForPrivacy(userId)
    }

    @GetMapping("/contacts/accepted")
    fun isAcceptedContact(
        @RequestParam @Positive(message = "Идентификатор первого пользователя должен быть положительным") firstUserId: Long,
        @RequestParam @Positive(message = "Идентификатор второго пользователя должен быть положительным") secondUserId: Long,
    ): InternalApplicantContactRelationResponse {
        return InternalApplicantContactRelationResponse(
            accepted = interactionService.isAcceptedContact(firstUserId, secondUserId),
        )
    }

    @GetMapping("/employer-access")
    fun hasEmployerAccessToApplicantProfile(
        @RequestParam @Positive(message = "Идентификатор работодателя должен быть положительным") employerUserId: Long,
        @RequestParam @Positive(message = "Идентификатор соискателя должен быть положительным") applicantUserId: Long,
    ): InternalEmployerApplicantProfileAccessResponse {
        return InternalEmployerApplicantProfileAccessResponse(
            canViewProfile = interactionService.hasEmployerAccessToApplicantProfile(
                employerUserId = employerUserId,
                applicantUserId = applicantUserId,
            ),
        )
    }
}
