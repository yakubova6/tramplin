package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class TwoFactorPasswordRequest(
    @field:Size(min = 8, max = 16, message = "Password should be between 8 and 16 characters")
    @field:NotBlank(message = "Password must not be empty")
    val password: String
)
