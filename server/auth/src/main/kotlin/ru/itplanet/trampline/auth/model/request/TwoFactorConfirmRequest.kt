package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class TwoFactorConfirmRequest(
    @field:NotBlank(message = "Pending token must not be empty")
    val pendingToken: String,

    @field:NotBlank(message = "Code must not be empty")
    @field:Pattern(regexp = "^\\d{6}$", message = "Code must contain 6 digits")
    val code: String
)
