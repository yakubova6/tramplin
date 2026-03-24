package ru.itplanet.trampline.auth.model.response

import ru.itplanet.trampline.auth.model.User

data class CurrentSessionResponse(
    val user: User,
    val session: SessionInfoResponse
)
