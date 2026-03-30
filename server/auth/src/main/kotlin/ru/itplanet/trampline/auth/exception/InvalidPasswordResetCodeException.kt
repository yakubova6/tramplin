package ru.itplanet.trampline.auth.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.BAD_REQUEST)
class InvalidPasswordResetCodeException :
    RuntimeException("Password reset code is invalid or expired")
