package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.NotBlank

data class TwoFactorResendRequest(
    @field:NotBlank(message = "Pending token must not be empty")
    val pendingToken: String
)
