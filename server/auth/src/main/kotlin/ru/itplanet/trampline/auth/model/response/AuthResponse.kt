package ru.itplanet.trampline.auth.model.response

import ru.itplanet.trampline.auth.model.User

data class AuthResponse(
    val sessionId: String,
    val user: User
)