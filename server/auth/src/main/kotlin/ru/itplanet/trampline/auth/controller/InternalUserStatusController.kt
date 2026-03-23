package ru.itplanet.trampline.auth.controller

import jakarta.validation.Valid
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.InternalUpdateUserStatusRequest
import ru.itplanet.trampline.auth.service.UserStatusService

@Validated
@RestController
@RequestMapping("/internal/users")
class InternalUserStatusController(
    private val userStatusService: UserStatusService
) {

    @PatchMapping("/{userId}/status")
    fun updateUserStatus(
        @PathVariable userId: Long,
        @Valid @RequestBody request: InternalUpdateUserStatusRequest
    ): User {
        return userStatusService.updateStatus(
            targetUserId = userId,
            request = request
        )
    }
}
