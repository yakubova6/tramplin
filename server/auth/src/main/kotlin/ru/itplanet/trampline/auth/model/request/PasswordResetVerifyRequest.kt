package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class PasswordResetVerifyRequest(
    @field:Email(message = "Email must be valid")
    @field:NotBlank(message = "Email must not be empty")
    val email: String,

    @field:NotBlank(message = "Code must not be empty")
    @field:Pattern(regexp = "\\d{6}", message = "Code must contain exactly 6 digits")
    val code: String
)
