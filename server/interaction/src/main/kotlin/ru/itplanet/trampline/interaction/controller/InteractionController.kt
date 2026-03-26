package ru.itplanet.trampline.interaction.controller

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.*
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse
import ru.itplanet.trampline.interaction.service.InteractionService

@RestController
@RequestMapping("/api/interaction")
class InteractionController(
    private val interactionService: InteractionService
) {

    // Отклики
    @PostMapping("/responses")
    fun applyResponse(@CurrentUser userId: Long, @Valid @RequestBody request: OpportunityResponseRequest): OpportunityResponseResponse =
        interactionService.apply(userId, request)

    @PatchMapping("/responses/{id}/status")
    fun updateResponseStatus(
        @CurrentUser userId: Long,
        @PathVariable id: Long,
        @RequestBody request: OpportunityResponseStatusUpdateRequest
    ): OpportunityResponseResponse = interactionService.updateApplicationStatus(id, userId, request)

    @GetMapping("/responses/my")
    fun getMyResponses(@CurrentUser userId: Long): List<OpportunityResponseResponse> =
        interactionService.getUserApplications(userId)

    @GetMapping("/opportunities/{opportunityId}/responses")
    fun getOpportunityResponses(@PathVariable opportunityId: Long, @CurrentUser userId: Long): List<OpportunityResponseResponse> =
        interactionService.getOpportunityApplications(opportunityId, userId)

    // Избранное
    @PostMapping("/favorites/{opportunityId}")
    fun addToFavorites(@CurrentUser userId: Long, @PathVariable opportunityId: Long): FavoriteResponse =
        interactionService.addToFavorites(userId, opportunityId)

    @DeleteMapping("/favorites/{opportunityId}")
    fun removeFromFavorites(@CurrentUser userId: Long, @PathVariable opportunityId: Long) =
        interactionService.removeFromFavorites(userId, opportunityId)

    @GetMapping("/favorites")
    fun getFavorites(@CurrentUser userId: Long): List<FavoriteResponse> =
        interactionService.getUserFavorites(userId)

    // Контакты
    @PostMapping("/contacts")
    fun addContact(@CurrentUser userId: Long, @RequestBody request: ContactRequest): ContactResponse =
        interactionService.addContact(userId, request)

    @PatchMapping("/contacts/{contactUserId}/accept")
    fun acceptContact(@CurrentUser userId: Long, @PathVariable contactUserId: Long): ContactResponse =
        interactionService.respondContact(userId, contactUserId, ContactStatus.ACCEPTED)

    @PatchMapping("/contacts/{contactUserId}/decline")
    fun declineContact(@CurrentUser userId: Long, @PathVariable contactUserId: Long): ContactResponse =
        interactionService.respondContact(userId, contactUserId, ContactStatus.DECLINED)

    @DeleteMapping("/contacts/{contactUserId}")
    fun removeContact(@CurrentUser userId: Long, @PathVariable contactUserId: Long) =
        interactionService.removeContact(userId, contactUserId)

    @GetMapping("/contacts")
    fun getContacts(@CurrentUser userId: Long): List<ContactResponse> =
        interactionService.getUserContacts(userId)
}