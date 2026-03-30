package ru.itplanet.trampline.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "auth.two-factor")
data class TwoFactorProperties(
    var codeTtlMinutes: Long = 10,
    var resendCooldownSeconds: Long = 60,
    var maxVerifyAttempts: Int = 5,
    var mailFrom: String = "no-reply@tramplin.local",
    var loginSubject: String = "Код входа Tramplin",
    var enableSubject: String = "Подтверждение включения 2FA Tramplin",
    var disableSubject: String = "Подтверждение отключения 2FA Tramplin"
)
