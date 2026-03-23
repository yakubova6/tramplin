package ru.itplanet.trampline.auth.service

import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.InternalUpdateUserStatusRequest

interface UserStatusService {
    fun updateStatus(
        targetUserId: Long,
        request: InternalUpdateUserStatusRequest
    ): User
}
