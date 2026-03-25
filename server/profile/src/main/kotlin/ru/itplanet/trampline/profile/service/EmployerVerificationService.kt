package ru.itplanet.trampline.profile.service

import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse

interface EmployerVerificationService {
    fun createVerificationRequest(
        employerUserId: Long,
        request: EmployerVerificationRequest
    ): EmployerVerificationResponse
}