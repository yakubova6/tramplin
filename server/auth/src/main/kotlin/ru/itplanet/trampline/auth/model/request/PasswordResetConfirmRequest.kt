package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class PasswordResetConfirmRequest(
    @field:Email(message = "Email must be valid")
    @field:NotBlank(message = "Email must not be empty")
    val email: String,

    @field:NotBlank(message = "Reset token must not be empty")
    val resetToken: String,

    @field:Size(min = 8, max = 16, message = "Password should be between 8 and 16 characters")
    @field:NotBlank(message = "Password must not be empty")
    val newPassword: String
)
