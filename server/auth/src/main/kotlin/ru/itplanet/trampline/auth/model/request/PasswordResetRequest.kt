package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class PasswordResetRequest(
    @field:Email(message = "Email must be valid")
    @field:NotBlank(message = "Email must not be empty")
    val email: String
)
