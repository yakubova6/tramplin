package ru.itplanet.trampline.interaction.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.request.CreateContactRecommendationRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.response.ContactRecommendationResponse
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import ru.itplanet.trampline.interaction.service.InteractionService

@RestController
@RequestMapping("/api/interaction")
class InteractionController(
    private val interactionService: InteractionService,
) {

    @PostMapping("/responses")
    fun applyResponse(
        @CurrentUser userId: Long,
        @Valid @RequestBody request: OpportunityResponseRequest,
    ): OpportunityResponseResponse = interactionService.apply(userId, request)

    @PatchMapping("/responses/{id}/status")
    fun updateResponseStatus(
        @CurrentUser userId: Long,
        @PathVariable id: Long,
        @RequestBody request: OpportunityResponseStatusUpdateRequest,
    ): OpportunityResponseResponse = interactionService.updateApplicationStatus(id, userId, request)

    @GetMapping("/responses/my")
    fun getMyResponses(
        @CurrentUser userId: Long,
    ): List<OpportunityResponseResponse> = interactionService.getUserApplications(userId)

    @PostMapping("/favorites/opportunities/{opportunityId}")
    fun addOpportunityToFavorites(
        @CurrentUser userId: Long,
        @PathVariable opportunityId: Long,
    ): FavoriteResponse = interactionService.addOpportunityToFavorites(userId, opportunityId)

    @DeleteMapping("/favorites/opportunities/{opportunityId}")
    fun removeOpportunityFromFavorites(
        @CurrentUser userId: Long,
        @PathVariable opportunityId: Long,
    ) = interactionService.removeOpportunityFromFavorites(userId, opportunityId)

    @PostMapping("/favorites/employers/{employerUserId}")
    fun addEmployerToFavorites(
        @CurrentUser userId: Long,
        @PathVariable employerUserId: Long,
    ): FavoriteResponse = interactionService.addEmployerToFavorites(userId, employerUserId)

    @DeleteMapping("/favorites/employers/{employerUserId}")
    fun removeEmployerFromFavorites(
        @CurrentUser userId: Long,
        @PathVariable employerUserId: Long,
    ) = interactionService.removeEmployerFromFavorites(userId, employerUserId)

    @GetMapping("/favorites")
    fun getFavorites(
        @CurrentUser userId: Long,
    ): List<FavoriteResponse> = interactionService.getUserFavorites(userId)

    @PostMapping("/contacts")
    fun addContact(
        @CurrentUser userId: Long,
        @RequestBody request: ContactRequest,
    ): ContactResponse = interactionService.addContact(userId, request)

    @PatchMapping("/contacts/{contactUserId}/accept")
    fun acceptContact(
        @CurrentUser userId: Long,
        @PathVariable contactUserId: Long,
    ): ContactResponse = interactionService.respondContact(userId, contactUserId, ContactStatus.ACCEPTED)

    @PatchMapping("/contacts/{contactUserId}/decline")
    fun declineContact(
        @CurrentUser userId: Long,
        @PathVariable contactUserId: Long,
    ): ContactResponse = interactionService.respondContact(userId, contactUserId, ContactStatus.DECLINED)

    @DeleteMapping("/contacts/{contactUserId}")
    fun removeContact(
        @CurrentUser userId: Long,
        @PathVariable contactUserId: Long,
    ) = interactionService.removeContact(userId, contactUserId)

    @GetMapping("/contacts")
    fun getContacts(
        @CurrentUser userId: Long,
    ): List<ContactResponse> = interactionService.getUserContacts(userId)

    @PostMapping("/recommendations")
    fun createRecommendation(
        @CurrentUser currentUser: AuthenticatedUser,
        @Valid @RequestBody request: CreateContactRecommendationRequest,
    ): ContactRecommendationResponse {
        ensureApplicant(currentUser)
        return interactionService.createRecommendation(currentUser.userId, request)
    }

    @GetMapping("/recommendations/incoming")
    fun getIncomingRecommendations(
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<ContactRecommendationResponse> {
        ensureApplicant(currentUser)
        return interactionService.getIncomingRecommendations(currentUser.userId)
    }

    @GetMapping("/recommendations/outgoing")
    fun getOutgoingRecommendations(
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<ContactRecommendationResponse> {
        ensureApplicant(currentUser)
        return interactionService.getOutgoingRecommendations(currentUser.userId)
    }

    @DeleteMapping("/recommendations/{id}")
    fun deleteRecommendation(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable id: Long,
    ) {
        ensureApplicant(currentUser)
        interactionService.deleteRecommendation(currentUser.userId, id)
    }

    private fun ensureApplicant(currentUser: AuthenticatedUser) {
        if (currentUser.role != Role.APPLICANT) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only applicant can manage recommendations",
            )
        }
    }
}
