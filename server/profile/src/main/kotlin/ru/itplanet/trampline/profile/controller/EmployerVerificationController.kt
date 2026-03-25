package ru.itplanet.trampline.profile.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse
import ru.itplanet.trampline.profile.service.EmployerVerificationService

@RestController
@RequestMapping("/api/employer/verification")
class EmployerVerificationController(
    private val verificationService: EmployerVerificationService
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createVerificationRequest(
        @CurrentUser employerUserId: Long,
        @Valid @RequestBody request: EmployerVerificationRequest
    ): EmployerVerificationResponse {
        return verificationService.createVerificationRequest(employerUserId, request)
    }
}