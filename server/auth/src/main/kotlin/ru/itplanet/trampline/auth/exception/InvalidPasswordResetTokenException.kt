package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.BAD_REQUEST)
class InvalidPasswordResetTokenException :
    RuntimeException("Password reset token is invalid or expired")
