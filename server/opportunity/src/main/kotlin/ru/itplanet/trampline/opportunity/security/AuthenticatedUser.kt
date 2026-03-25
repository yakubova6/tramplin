package ru.itplanet.trampline.opportunity.security

import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.Status

data class AuthenticatedUser(
    val userId: Long,
    val email: String,
    val role: Role,
    val status: Status
)
