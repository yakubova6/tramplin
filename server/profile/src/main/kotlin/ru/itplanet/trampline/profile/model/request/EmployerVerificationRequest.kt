package ru.itplanet.trampline.profile.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class EmployerVerificationRequest(
    @field:NotBlank(message = "Способ верификации обязателен")
    val verificationMethod: String,

    @field:Email(message = "Укажите корректный корпоративный адрес электронной почты")
    val corporateEmail: String?,

    val professionalLinks: List<String> = emptyList(),

    val submittedComment: String? = null,
)
