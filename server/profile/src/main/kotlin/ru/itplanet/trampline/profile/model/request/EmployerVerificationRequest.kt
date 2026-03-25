package ru.itplanet.trampline.profile.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class EmployerVerificationRequest(
    @field:NotBlank
    val verificationMethod: String,

    @field:Email
    val corporateEmail: String?,

    @field:Pattern(regexp = "\\d{10,12}", message = "ИНН должен содержать 10-12 цифр")
    val inn: String? = null,

    val professionalLinks: List<String> = emptyList(),

    val submittedComment: String? = null
)