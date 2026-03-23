package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Positive
import ru.itplanet.trampline.auth.model.Status

data class InternalUpdateUserStatusRequest(
    @field:Positive(message = "Actor user id must be positive")
    val actorUserId: Long,

    val status: Status
)
