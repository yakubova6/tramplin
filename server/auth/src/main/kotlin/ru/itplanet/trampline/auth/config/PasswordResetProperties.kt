package ru.itplanet.trampline.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "auth.password-reset")
data class PasswordResetProperties(
    var codeTtlMinutes: Long = 10,
    var resetTokenTtlMinutes: Long = 10,
    var resendCooldownSeconds: Long = 60,
    var maxVerifyAttempts: Int = 5,
    var mailFrom: String = "no-reply@trampline.local",
    var subject: String = "Код сброса пароля Trampline"
)
