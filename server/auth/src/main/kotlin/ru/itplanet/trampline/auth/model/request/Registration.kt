package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.auth.model.Role

data class Registration(
    @field:NotBlank(message = "Display name must not be empty")
    @field:Size(max = 120, message = "Display name must not be longer than 120 characters")
    val displayName: String,
    @field:Email(message = "Email must be valid")
    @field:NotBlank(message = "Email must not be empty")
    val email: String,
    @field:Size(min = 8, max = 16, message = "Password should be between 8 and 16 characters")
    @field:NotBlank(message = "Password must not be empty")
    val password: String,
    val role: Role
)
