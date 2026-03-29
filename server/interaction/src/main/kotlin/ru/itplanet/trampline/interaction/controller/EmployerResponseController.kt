package ru.itplanet.trampline.interaction.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.model.request.GetEmployerResponseListRequest
import ru.itplanet.trampline.interaction.model.response.EmployerOpportunityResponseItem
import ru.itplanet.trampline.interaction.model.response.EmployerResponsePage
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import ru.itplanet.trampline.interaction.service.InteractionService

@Validated
@RestController
@RequestMapping("/api/employer/responses")
class EmployerResponseController(
    private val interactionService: InteractionService,
) {

    @GetMapping
    fun getEmployerResponses(
        @Valid @ModelAttribute request: GetEmployerResponseListRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerResponsePage<EmployerOpportunityResponseItem> {
        ensureEmployer(currentUser)
        return interactionService.getEmployerResponses(currentUser.userId, request)
    }

    private fun ensureEmployer(currentUser: AuthenticatedUser) {
        if (currentUser.role != Role.EMPLOYER) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only employer can view employer responses",
            )
        }
    }
}
